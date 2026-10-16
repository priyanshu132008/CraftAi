"""CraftAI FastAPI entrypoint — multi-agent generation pipeline.

Run from the project root with either:
    uvicorn main:app --reload          # root wrapper -> this app
    uvicorn ai_engine.main:app --reload
"""
import asyncio
import json
import os
import re
import shutil
import sys
import threading
import time
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Optional

import httpx
from dotenv import load_dotenv

# Project root (parent of this ai_engine folder). Put it on sys.path so the
# `ai_engine.*` absolute imports below resolve no matter where uvicorn is
# launched from. Also pin CWD to root so relative paths (prompts, generated
# files) resolve.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

# Agent credentials (Groq / Ollama / NVIDIA) live in ai_engine/.env; Supabase
# credentials (used to verify Bearer tokens on /generate-project) live in
# backend-craftai/.env. The path is resolved explicitly (cwd-independent)
# and override=True forces the file values to win over any stale/empty
# GOOGLE_* etc. already exported in the shell.
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)
load_dotenv(ROOT / "backend-craftai" / ".env", override=True)

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from ai_engine.agents.architect import ArchitectAgent
from ai_engine.agents.debugger import DebuggerAgent
from ai_engine.agents.developer import DeveloperAgent, SUPPORTED_CONNECTORS, VAULT_ENV_VARS
from ai_engine.routes.oauth import router as oauth_router

app = FastAPI(title="CraftAI Engine")

# Universal OAuth 2.0 engine for the Connectors Hub (authorize + callback).
app.include_router(oauth_router)


@app.on_event("startup")
async def _startup_env_debug():
    """Prove on boot whether the .env was actually parsed."""
    print("=== ENV DEBUG ===")
    print(f"Path used: {env_path}")
    print(f"GOOGLE_CLIENT_ID loaded: {bool(os.getenv('GOOGLE_CLIENT_ID'))}")
    print("=================")

# CORS: comma-separated CORS_ORIGINS in prod (e.g. the Vercel domain) plus the
# production domains, wildcard default so the browser frontend can't get blocked.
# Uses Bearer auth only (no cookies), so a wildcard origin is safe.
_cors_origins = [
    o.strip()
    for o in ("https://craftai.diy,https://www.craftai.diy,"
              + os.environ.get("CORS_ORIGINS", "")).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["*"],
    allow_credentials=bool(_cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Generated projects are written in full to a dedicated workspace folder at
# the repo root (generated_projects/<project_id>/…). The .ts/.tsx files are
# additionally mirrored into the Vite frontend under src/generated/project/
# (with the entry re-exported by GeneratedPage.tsx) so the dev server
# hot-compiles them and serves the app at http://localhost:3000/preview.
# The workspace itself (src/App.tsx etc.) must never be overwritten.
PROJECTS_ROOT = ROOT / "generated_projects"
PREVIEW_PROJECT_DIR = ROOT / "frontend" / "src" / "generated" / "project"
PREVIEW_ENTRY = ROOT / "frontend" / "src" / "generated" / "GeneratedPage.tsx"
PREVIEW_URL = "http://localhost:3000/preview"
BACKEND_ORIGIN = "http://localhost:8000"

# Extensions that go through the Vite sanitization + mirror; everything else
# (package.json, README, config snippets…) is only written to the workspace
# dir. CSS is mirrored too (imported by generated entries) but not
# sanitized — the JS-oriented sanitizer would corrupt it.
CODE_EXTS = {".ts", ".tsx", ".js", ".jsx"}
MIRROR_EXTS = CODE_EXTS | {".css"}

# Where the previewable React entry lives inside a generated project, in
# preference order.
ENTRY_CANDIDATES = (
    "src/App.tsx",
    "src/app/page.tsx",
    "src/main.tsx",
    "src/index.tsx",
    "App.tsx",
    "page.tsx",
    # Monorepo scopes (Full-Stack Spec / Microservice API…)
    "frontend/src/App.tsx",
    "frontend/src/main.tsx",
)

# Agents are created lazily on the first request: DebuggerAgent.__init__
# raises without NVIDIA_API_KEY, and that must not crash server startup.
_agents = None

def _env(name: str) -> str:
    """os.getenv with paste-proofing: Render dashboard values sometimes
    arrive with surrounding quotes/whitespace, which would silently break
    Supabase auth and persistence."""
    return os.getenv(name, "").strip().strip('"').strip("'").strip()


SUPABASE_URL = _env("SUPABASE_URL").rstrip("/")
SUPABASE_ANON_KEY = _env("SUPABASE_ANON_KEY")
# Server-side persistence bypasses RLS, whose owner-id check has repeatedly
# 403'd the user-JWT insert in production (PostgREST 42501). Ownership is
# instead enforced EXPLICITLY (user_id filters from the verified token) on
# every read/write path below. Used only when configured.
SUPABASE_SERVICE_ROLE_KEY = (_env("SUPABASE_SERVICE_ROLE_KEY")
                             or _env("SERVICE_ROLE_SECRET_KEY"))


def _sb_headers(user_token: Optional[str]) -> dict:
    """Auth headers for PostgREST: service role when configured (RLS
    bypass — ownership enforced in code), else the caller's JWT (RLS
    scopes everything to the caller)."""
    if SUPABASE_SERVICE_ROLE_KEY:
        return {"apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    return {"apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {user_token or SUPABASE_ANON_KEY}"}

# Vercel auto-deploy (publish flow): token required, team id optional
# (organization accounts scope every call with ?teamId=).
VERCEL_API_TOKEN = os.getenv("VERCEL_API_TOKEN", "")
VERCEL_TEAM_ID = os.getenv("VERCEL_TEAM_ID", "")


def _get_agents():
    global _agents
    if _agents is None:
        _agents = {
            "architect": ArchitectAgent(),
            "developer": DeveloperAgent(),
            "debugger": DebuggerAgent(),
        }
    return _agents


class PipelineError(Exception):
    """Raised when a pipeline stage fails; carries a user-safe message."""


# ---------------------------------------------------------------------------
# Agent thought-stream telemetry (Module 4).
#
# The pipeline runs synchronously in FastAPI's threadpool; step events are
# fanned out to all connected SSE clients on /generation-events. Each event
# is also appended to the request-local trace so the HTTP response carries
# the full execution trace even when no client was listening.
# ---------------------------------------------------------------------------
_trace_lock = threading.Lock()
_trace_subscribers: list = []  # [(event_loop, asyncio.Queue), ...]


def _emit_event(event: dict, trace: Optional[list] = None) -> None:
    """Broadcast a pipeline step event to SSE clients + collect it locally."""
    event = {"ts": time.time(), **event}
    if trace is not None:
        trace.append(event)
    with _trace_lock:
        subscribers = list(_trace_subscribers)
    for loop, queue in subscribers:
        try:
            loop.call_soon_threadsafe(queue.put_nowait, event)
        except RuntimeError:
            pass  # loop closed between snapshot and delivery


@app.get("/generation-events")
async def generation_events():
    """SSE stream of live agent execution steps for the workspace trace UI."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    with _trace_lock:
        _trace_subscribers.append((loop, queue))

    async def stream():
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            with _trace_lock:
                try:
                    _trace_subscribers.remove((loop, queue))
                except ValueError:
                    pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Multi-mode console (Module 2): build | chat | plan.
# ---------------------------------------------------------------------------
GENERATION_MODES = ("build", "chat", "plan")

# Interactive design-direction decision cards (Module 4) returned in plan
# mode (and whenever the Architect's plan itself proposes directions).
DESIGN_DIRECTIONS = [
    {"id": "glassmorphism", "title": "Glassmorphic Dark"},
    {"id": "minimal", "title": "Clean Minimalist"},
    {"id": "neobrutalism", "title": "Neo-Brutalist"},
    {"id": "corporate", "title": "Corporate Gradient"},
]

CHAT_SYSTEM_PROMPT = """You are CraftAI's senior full-stack technical
assistant. Answer technical questions, explore feature ideas, and review
code concepts conversationally. Be concise, concrete and practical — use
short paragraphs, bullets and fenced code blocks where they help. You are
NOT generating files in this mode, so do not output whole project trees."""

PLAN_SYSTEM_PROMPT = """You are CraftAI's Architect Agent producing a
detailed TECHNICAL SPECIFICATION (not code) for the requested product.

Respond in Markdown with exactly these sections:
# Overview — what is being built and for whom.
# Tech Stack — chosen frontend/backend/data layers with one-line reasons.
# Database Schema — tables/collections with fields and types (table or list).
# Component Tree — the React component hierarchy as an indented tree.
# File Structure — the full repository file tree in a fenced code block.
# API Routes — endpoints with method, path, purpose.
# Design Direction — the recommended visual direction.
# Roadmap — 3-4 phased implementation milestones.

Be specific to the request (real entity names, real sections) — no lorem
ipsum, no generic filler. Output Markdown only."""

# Optional design style the user picked in the console, injected into the
# architect/developer prompt so it steers both plan and build modes.


def _style_line(design_style: Optional[str]) -> str:
    if not design_style:
        return ""
    return f"\n\nPreferred design style: {design_style}."


def _context_lines(context: Optional[str]) -> str:
    if not context or not context.strip():
        return ""
    return ("\n\nAdditional context from the user (connector wiring\n"
            "instructions and any attached file):\n---\n"
            + context.strip()[:4000] + "\n---")


def _custom_lines(custom_connectors: Optional[list],
                  mcp_servers: Optional[list]) -> str:
    """Describe the user's custom APIs and MCP servers for the Architect so
    their endpoints/capabilities are incorporated into the project plan."""
    lines = []
    if custom_connectors:
        lines.append("\n\nThe user has connected these custom APIs:")
        for cc in custom_connectors:
            headers = cc.get("headers") or {}
            lines.append(
                f"- {cc['name']} at {cc['baseUrl']} "
                f"(auth header: {list(headers)[0] if headers else 'none'})"
            )
        lines.append("Plan sections/features that make real use of their "
                     "endpoints where the prompt allows.")
    if mcp_servers:
        lines.append("\n\nThe user has connected these MCP servers:")
        for srv in mcp_servers:
            lines.append(f"- {srv['name']} at {srv['serverUrl']}")
        lines.append("Plan features that can leverage these MCP tool "
                     "servers (data access, search, automation).")
    return "\n".join(lines)


def _conversational_reply(prompt: str, mode: str,
                          design_style: Optional[str] = None,
                          context: Optional[str] = None) -> str:
    """Run a chat/plan turn through the Architect's fast LLM client.

    No file-system writes, no preview refresh — the reply is returned as a
    Markdown message for the chat panel.
    """
    agents = _get_agents()
    architect = agents["architect"]
    system = CHAT_SYSTEM_PROMPT if mode == "chat" else PLAN_SYSTEM_PROMPT
    user_content = prompt + _style_line(design_style) + _context_lines(context)
    try:
        response = architect.client.chat.completions.create(
            model=architect.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            temperature=0.4,
        )
        reply = (response.choices[0].message.content or "").strip()
        if not reply:
            raise PipelineError(f"{mode} agent returned an empty response")
        return reply
    except PipelineError:
        raise
    except Exception as exc:
        raise PipelineError(f"{mode} agent call failed: {exc}")


def _run_pipeline(prompt: str, connectors: Optional[list] = None,
                  trace: Optional[list] = None,
                  design_style: Optional[str] = None,
                  context: Optional[str] = None,
                  custom_connectors: Optional[list] = None,
                  mcp_servers: Optional[list] = None,
                  connector_rules: Optional[dict] = None,
                  connector_secrets: Optional[dict] = None,
                  scope: Optional[str] = None):
    """ArchitectAgent -> DeveloperAgent -> DebuggerAgent.

    Returns (architect_json_plan, files, entry_path) where `files` is the
    normalized [{path, content}] list and `entry_path` the previewable React
    entry. Each stage emits a live step event to the thought stream. Sync on
    purpose so the blocking LLM calls run in FastAPI's threadpool instead of
    freezing the event loop.
    """
    agents = _get_agents()

    def emit(step: str, message: str, detail: Optional[str] = None):
        event = {"step": step, "message": message}
        if detail:
            event["detail"] = detail
        _emit_event(event, trace)

    full_prompt = (prompt + _style_line(design_style)
                   + _context_lines(context)
                   + _custom_lines(custom_connectors, mcp_servers))

    emit("architect:started", "Analyzing prompt intent…")
    plan = agents["architect"].plan_architecture(full_prompt)
    if not plan:
        raise PipelineError("Architect agent returned an empty plan")
    emit("architect:completed",
         f"Plan ready — {plan.get('type', 'app')} for the "
         f"{plan.get('niche', 'general')} niche, "
         f"{len(plan.get('sections', []))} sections mapped.")

    wiring = (f" & wiring {', '.join(connectors)}"
              if connectors else "")
    if custom_connectors:
        wiring += f" + {len(custom_connectors)} custom API"
    if mcp_servers:
        wiring += f" + {len(mcp_servers)} MCP"
    emit("developer:generating_files", f"Assembling components{wiring}…")
    files = agents["developer"].generate_files(
        plan, connectors,
        custom_connectors=custom_connectors, mcp_servers=mcp_servers,
        connector_rules=connector_rules, connector_secrets=connector_secrets,
        scope=scope, context=context)
    if not files:
        raise PipelineError("Developer agent returned no files")
    emit("developer:completed",
         f"Generated {len(files)} files.",
         detail=", ".join(f["path"] for f in files[:12]))

    entry = _select_entry(files)
    if entry is None:
        raise PipelineError("Developer agent returned no React entry file")

    emit("debugger:verifying_ast", "Running AST structural check…")
    passed, problems = agents["debugger"].structural_check(
        entry["content"], plan)
    # QA pass on the entry page (hybrid fast-check; the LLM repair pass only
    # runs in thorough mode when the structural check fails).
    fixed = agents["debugger"].validate_and_fix_code(
        plan, entry["content"], fast_mode=True)
    if fixed:
        entry["content"] = fixed
    emit("debugger:completed",
         f"{len(problems)} problem{'s' if len(problems) != 1 else ''} found"
         + (" — structural check passed." if passed
            else " — fast mode kept the original code."))

    return plan, files, entry["path"]


def _select_entry(files: list) -> Optional[dict]:
    """Pick the previewable entry file from the generated project."""
    by_path = {f["path"].lstrip("./"): f for f in files}
    for candidate in ENTRY_CANDIDATES:
        if candidate in by_path:
            return by_path[candidate]
    # Fall back: prefer a component-looking name, then any TSX/JSX file.
    for f in files:
        if re.search(r"(App|Page|Home)\.tsx?$", f["path"]):
            return f
    for f in files:
        if PurePosixPath(f["path"]).suffix in (".tsx", ".jsx"):
            return f
    return None


def _safe_relpath(raw: str) -> Optional[Path]:
    """Normalize a generated file path to a safe relative path.

    Rejects absolute paths, drive letters and any traversal ("..") so a
    hostile/buggy model path can never escape the target directory.
    """
    if not raw or not isinstance(raw, str):
        return None
    pure = PurePosixPath(raw.strip().replace("\\", "/"))
    parts = [seg for seg in pure.parts
             if seg not in ("", ".", "..") and ":" not in seg]
    if not parts:
        return None
    return Path(*parts)


def _make_project_id(plan: dict, prompt: str) -> str:
    """Readable, unique-ish workspace folder name from the plan/prompt."""
    base = (plan or {}).get("niche") or prompt or "project"
    slug = re.sub(r"[^a-z0-9]+", "-", str(base).lower()).strip("-")[:40]
    return f"{int(time.time())}-{slug or 'project'}"


def _write_workspace(files: list, project_id: str,
                     trace: Optional[list] = None) -> tuple:
    """Write EVERY generated file to generated_projects/<project_id>/.

    Creates subdirectories as needed. Emits one SSE event per file so the
    workspace terminal streams write progress live during the build.
    Returns (project_dir, written_paths).
    """
    project_dir = PROJECTS_ROOT / project_id
    written = []
    total = len(files)
    for f in files:
        rel = _safe_relpath(f["path"])
        if rel is None:
            print(f"[generate-project] skipping unsafe path: {f['path']!r}")
            continue
        target = project_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f["content"], encoding="utf-8")
        written.append(rel.as_posix())
        _emit_event({"step": "file:written",
                     "message": f"Wrote {rel.as_posix()}",
                     "detail": f"{len(written)}/{total}"}, trace)
    return project_dir, written


# Fallback preview entry written when GeneratedPage.tsx is missing or still
# in a legacy format. Mirrors frontend/src/generated/GeneratedPage.tsx.
PREVIEW_ENTRY_TEMPLATE = '''// @ts-nocheck
// Stable preview entry for http://localhost:3000/preview.
// The backend mirrors each generated project under src/generated/project/
// and rewrites the `entryPath` line below on every generation.
import React, {{ useEffect, useState }} from 'react';

let entryPath = '{entry}';

const IMPORT_ATTEMPTS = 5;
const IMPORT_RETRY_MS = 700;

export default function GeneratedPage() {{
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {{
    let cancelled = false;
    let attempts = 0;
    setError(null);
    setComponent(null);
    // Mirror files land milliseconds before the preview iframe remounts;
    // Vite's first on-demand transform can transiently fail — retry
    // instead of sticking on the empty state.
    const attemptImport = () => {{
      attempts += 1;
      import(/* @vite-ignore */ entryPath)
        .then(m => {{ if (!cancelled) setComponent(() => m.default); }})
        .catch(e => {{
          if (cancelled) return;
          if (attempts < IMPORT_ATTEMPTS) {{
            setTimeout(attemptImport, IMPORT_RETRY_MS);
          }} else {{
            setError(String(e));
          }}
        }});
    }};
    attemptImport();
    return () => {{ cancelled = true; }};
  }}, []);

  if (error) {{
    return (
      <div style={{{{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: '#090D16', color: '#64748B', fontFamily: 'system-ui }}}}>
        <span style={{{{ fontSize: '1.1rem', color: '#94A3B8' }}}}>No preview yet</span>
        <span style={{{{ fontSize: '0.82rem' }}}}>
          Generate an app from the CraftAI dashboard — it will render here.
        </span>
        <span style={{{{ maxWidth: 640, fontSize: '0.72rem',
          fontFamily: 'ui-monospace, monospace', color: '#475569',
          overflowWrap: 'anywhere' }}}}>
          {{error}}
        </span>
      </div>
    );
  }}
  if (!Component) {{
    return (
      <div style={{{{ minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#64748B', fontFamily: 'system-ui' }}}}>
        Compiling generated app…
      </div>
    );
  }}
  return <Component />;
}}
'''

PREVIEW_ENTRY_MARKER = re.compile(r"let entryPath = '[^']*';")


def _refresh_preview(files: list, entry_path: str) -> None:
    """Mirror the generated project into the Vite preview module graph.

    Replaces the previous mirror wholesale (so stale imports never linger),
    sanitizes each code file for Vite, and points the stable preview entry's
    `entryPath` at this generation's entry file. The entry keeps a runtime
    dynamic import so the repo always builds, even before the first
    generation.
    """
    if PREVIEW_PROJECT_DIR.exists():
        shutil.rmtree(PREVIEW_PROJECT_DIR)
    PREVIEW_PROJECT_DIR.mkdir(parents=True)

    for f in files:
        rel = _safe_relpath(f["path"])
        if rel is None or rel.suffix not in MIRROR_EXTS:
            continue
        target = PREVIEW_PROJECT_DIR / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        content = (_sanitize_for_vite(f["content"])
                   if rel.suffix in CODE_EXTS else f["content"])
        target.write_text(content, encoding="utf-8")

    rel_entry = _safe_relpath(entry_path)
    entry_specifier = f"./project/{rel_entry.as_posix()}"
    existing = PREVIEW_ENTRY.read_text(encoding="utf-8") if PREVIEW_ENTRY.exists() else ""
    if PREVIEW_ENTRY_MARKER.search(existing):
        PREVIEW_ENTRY.write_text(
            PREVIEW_ENTRY_MARKER.sub(f"let entryPath = '{entry_specifier}';",
                                     existing, count=1),
            encoding="utf-8",
        )
    else:
        PREVIEW_ENTRY.write_text(
            PREVIEW_ENTRY_TEMPLATE.format(entry=entry_specifier),
            encoding="utf-8",
        )


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the token from an `Authorization: Bearer <token>` header."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _verify_supabase_token(token: str) -> Optional[dict]:
    """Verify a Supabase JWT against the Supabase auth server.

    Returns the user payload on success, None on failure. When Supabase is
    not configured (missing URL/key), a structurally valid header is
    accepted so local demos still run — but only after the header check.
    Every failure path logs the exact cause BEFORE the caller's 401 goes
    out, so Render logs always say why a token was rejected.
    """
    # Config visibility first: a 401 caused by a missing/rotated key is
    # indistinguishable from a bad token without this line.
    masked = (f"...{SUPABASE_ANON_KEY[-6:]}" if SUPABASE_ANON_KEY
              and len(SUPABASE_ANON_KEY) > 6 else None)
    print(f"[auth] config: SUPABASE_URL={'set' if SUPABASE_URL else 'MISSING'} "
          f"SUPABASE_ANON_KEY={masked or 'MISSING'}")
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[auth] SUPABASE_URL/SUPABASE_ANON_KEY not configured — "
              "skipping token verification (header presence only)")
        return {"id": "local", "email": "local-demo@craftai"}

    try:
        last_exc = None
        for attempt in range(3):
            try:
                resp = httpx.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {token}",
                    },
                    timeout=10.0,
                )
                break
            except httpx.TransportError as exc:
                # Flaky DNS/NAT64 networks fail the first lookup; retry.
                last_exc = exc
                print(f"[AUTH ERROR] Token verification transport failure "
                      f"(attempt {attempt + 1}/3): {exc!r}")
                time.sleep(1.0)
        else:
            raise last_exc
    except httpx.HTTPError as exc:
        print(f"[AUTH ERROR] Token verification failed: {exc!r}")
        return None

    if resp.status_code == 200:
        return resp.json()
    print(f"[AUTH ERROR] Token verification failed: HTTP {resp.status_code} "
          f"from /auth/v1/user — {resp.text[:300]}")
    return None


def _unauthorized(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"status": "error", "message": message},
    )


# lucide-react 1.x removed its brand icons, but models still hallucinate
# them — one `import { Github }` is a fatal Vite import crash in /preview.
# Swap brand glyphs to safe look-alikes in mirrored code files.
# ponytail: whole-word swap also rewrites copy/text strings ("Twitter" ->
# "Globe" inside prose). Narrow to JSX scope only if that ever ships.
_ICON_ALIASES = {
    "Github": "Globe", "Gitlab": "Globe", "Twitter": "Globe",
    "Facebook": "Globe", "Chrome": "Globe", "Google": "Globe",
    "Instagram": "Camera", "Linkedin": "Briefcase", "Youtube": "Play",
    "Slack": "MessageSquare", "Apple": "Smartphone", "Dribbble": "Palette",
    "Twitch": "Tv", "Figma": "PenTool",
}


def _fix_lucide_imports(code: str) -> str:
    """Replace removed lucide brand icons with safe aliases, then dedupe the
    named import list (a swap colliding with an existing import would leave
    `{ Globe, Globe }` — itself a syntax error)."""
    if "lucide-react" not in code:
        return code
    for brand, safe in _ICON_ALIASES.items():
        code = re.sub(rf"\b{brand}\b", safe, code)

    def dedupe(m):
        seen, out = set(), []
        for name in m.group(1).split(","):
            key = name.strip()
            if key and key not in seen:
                seen.add(key)
                out.append(key)
        return f"import {{ {', '.join(out)} }} from 'lucide-react'"

    return re.sub(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']',
                  dedupe, code)


def _sanitize_for_vite(code: str) -> str:
    """Adapt a Next.js-style generated page for the Vite preview host.

    - drop the meaningless-outside-Next "use client" directive
    - prepend @ts-nocheck so `tsc --noEmit` never breaks on LLM output
    - replace next/link <Link> with plain <a> (same href prop)
    - swap hallucinated lucide-react brand icons for safe aliases
    """
    text = re.sub(r'^["\']use client["\'];?\s*\n?', "", code.strip())
    text = re.sub(r'^import\s+Link\s+from\s+["\']next/link["\'];?\s*\n', "",
                  text, flags=re.MULTILINE)
    text = re.sub(r"<Link\b", "<a", text)
    text = re.sub(r"</Link\s*>", "</a>", text)
    text = _fix_lucide_imports(text)
    return "// @ts-nocheck\n" + text.strip() + "\n"


def _extract_connectors(payload: dict) -> Optional[list]:
    """Validate the optional `connectors` array from the request body.

    Returns None when absent, otherwise the filtered list of supported
    connector names (unknown names are dropped with a log line).
    """
    connectors = (payload or {}).get("connectors")
    if connectors is None:
        return None
    if not isinstance(connectors, list) or not all(
            isinstance(c, str) for c in connectors):
        return []
    valid = [c for c in connectors if c in SUPPORTED_CONNECTORS]
    dropped = set(connectors) - set(valid)
    if dropped:
        print(f"[generate-project] ignoring unsupported connectors: {sorted(dropped)}")
    return valid


def _extract_custom_connectors(payload: dict) -> list:
    """Validate the optional `custom_connectors` array:
    [{name, baseUrl, headers, openApiSchema?}] — user-defined REST APIs the
    generated app should get typed wrapper clients for.
    """
    raw = (payload or {}).get("custom_connectors")
    if not isinstance(raw, list):
        return []
    valid = []
    for entry in raw[:10]:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name", "")).strip()[:60]
        base_url = str(entry.get("baseUrl", "")).strip()[:300]
        if not name or not base_url.lower().startswith("http"):
            continue
        headers_in = entry.get("headers")
        headers = {}
        if isinstance(headers_in, dict):
            headers = {str(k)[:100]: str(v)[:200]
                       for k, v in list(headers_in.items())[:5]}
        schema = entry.get("openApiSchema")
        valid.append({
            "name": name, "baseUrl": base_url, "headers": headers,
            "openApiSchema": str(schema)[:6000] if schema else "",
        })
    dropped = len(raw) - len(valid)
    if dropped:
        print(f"[generate-project] dropped {dropped} invalid custom connectors")
    return valid


def _extract_mcp_servers(payload: dict) -> list:
    """Validate the optional `mcp_servers` array:
    [{name, serverUrl, authToken?}] — MCP servers the generated app calls
    via JSON-RPC over SSE/HTTP.
    """
    raw = (payload or {}).get("mcp_servers")
    if not isinstance(raw, list):
        return []
    valid = []
    for entry in raw[:10]:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name", "")).strip()[:60]
        server_url = str(entry.get("serverUrl", "")).strip()[:300]
        if not name or not (server_url.lower().startswith("http")
                           or server_url.lower().startswith("wss")):
            continue
        token = entry.get("authToken")
        valid.append({
            "name": name, "serverUrl": server_url,
            "authToken": str(token)[:400] if token else "",
        })
    return valid


def _extract_connector_rules(payload: dict) -> dict:
    """Validate the optional agent-permission maps from the connector vault:
    `connector_permissions` = {connector_id: 'ask'|'always'|'never'} and
    `connector_credentials` = {connector_id: bool} (configured-flags only —
    raw secret values never leave the browser; generated code reads keys
    from import.meta.env.VITE_* at runtime).

    Returns {connector_id: {"permission": mode, "credentials": bool}} for
    known connectors only.
    """
    out: dict = {}
    perms = (payload or {}).get("connector_permissions")
    if isinstance(perms, dict):
        for cid, mode in list(perms.items())[:50]:
            if (cid in SUPPORTED_CONNECTORS
                    and mode in ("ask", "always", "never")):
                out.setdefault(cid, {})
                out[cid]["permission"] = mode
    flags = (payload or {}).get("connector_credentials")
    if isinstance(flags, dict):
        for cid, flag in list(flags.items())[:50]:
            if cid in SUPPORTED_CONNECTORS:
                out.setdefault(cid, {})
                out[cid]["credentials"] = bool(flag)
    for rule in out.values():
        rule.setdefault("credentials", False)
    return out


def _extract_connector_secrets(payload: dict) -> dict:
    """Validate the optional `connector_secrets` vault values from the
    api_key-tier credential forms (Categories 2-7: Cloud & Database,
    Messaging & OTP, AI Providers, Ecommerce, Productivity, Design &
    Assets):
    {connector_id: {field: value}}. Trust boundary: only known vault
    connector ids and their whitelisted field keys (VAULT_ENV_VARS) are
    accepted; everything else is dropped.

    Returned values are injected into the generated app's .env by the
    Developer Agent.
    """
    raw = (payload or {}).get("connector_secrets")
    if not isinstance(raw, dict):
        return {}
    out: dict = {}
    for cid, fields in list(raw.items())[:50]:
        env_map = VAULT_ENV_VARS.get(cid)
        if not env_map or not isinstance(fields, dict):
            continue
        clean = {}
        for fkey, value in list(fields.items())[:20]:
            if fkey in env_map and isinstance(value, str) and value.strip():
                clean[fkey] = value.strip()[:500]
        if clean:
            out[cid] = clean
    return out


def _extract_mode(payload: dict) -> str:
    """Validate the optional console `mode` (build | chat | plan)."""
    mode = (payload or {}).get("mode") or "build"
    if mode not in GENERATION_MODES:
        mode = "build"
    return mode


def _extract_str(payload: dict, key: str, limit: int = 8000) -> Optional[str]:
    """Validate an optional string payload field (design_style, context)."""
    value = (payload or {}).get(key)
    if not value or not isinstance(value, str):
        return None
    return value.strip()[:limit] or None


def _generate_and_write(prompt: str, connectors: Optional[list],
                        design_style: Optional[str] = None,
                        context: Optional[str] = None,
                        custom_connectors: Optional[list] = None,
                        mcp_servers: Optional[list] = None,
                        connector_rules: Optional[dict] = None,
                        connector_secrets: Optional[dict] = None,
                        owner: Optional[str] = None,
                        scope: Optional[str] = None) -> dict:
    """Shared build-mode flow: run the pipeline, persist the full project to
    the workspace folder, refresh the Vite preview mirror, and build the
    success response payload (including the execution trace)."""
    trace: list = []
    t0 = time.time()
    plan, files, entry_path = _run_pipeline(
        prompt, connectors, trace=trace,
        design_style=design_style, context=context,
        custom_connectors=custom_connectors, mcp_servers=mcp_servers,
        connector_rules=connector_rules, connector_secrets=connector_secrets,
        scope=scope)
    elapsed = time.time() - t0

    entry = _select_entry(files)
    project_id = _make_project_id(plan, prompt)
    _emit_event({"step": "writing:files",
                 "message": f"Writing {len(files)} files to the workspace…"},
                trace)
    project_dir, written = _write_workspace(files, project_id, trace)
    # Owner stamp — /api/projects lists only workspaces whose owner.json
    # matches the caller, so recents never leak across accounts.
    if owner:
        (project_dir / "owner.json").write_text(json.dumps({"owner": owner}))
    _refresh_preview(files, entry_path)
    _emit_event({"step": "done",
                 "message": "Generation complete — preview updated.",
                 "detail": project_id}, trace)

    print(f"[generate-project] prompt={prompt!r} | pipeline={elapsed:.1f}s "
          f"| {len(written)} files -> {project_dir}")

    directions = plan.get("design_directions")
    return {
        "status": "success",
        "mode": "build",
        "plan": plan,
        "project_id": project_id,
        "projectPath": project_dir.relative_to(ROOT).as_posix(),
        "files": files,
        "entry_path": entry_path,
        "generated_code": entry["content"],
        "connectors": connectors or [],
        "custom_connectors": custom_connectors or [],
        "mcp_servers": mcp_servers or [],
        "connector_permissions": {cid: r.get("permission", "ask")
                                  for cid, r in (connector_rules or {}).items()},
        "design_style": design_style,
        "design_directions": (directions if isinstance(directions, list)
                               else DESIGN_DIRECTIONS),
        "trace": trace,
        "preview_url": PREVIEW_URL,
    }


def _conversational_response(prompt: str, mode: str,
                             connectors: Optional[list],
                             design_style: Optional[str] = None,
                             context: Optional[str] = None,
                             custom_connectors: Optional[list] = None,
                             mcp_servers: Optional[list] = None) -> dict:
    """Shared chat/plan-mode flow: LLM reply only, no file-system writes."""
    trace: list = []
    t0 = time.time()
    _emit_event({"step": f"{mode}:started",
                 "message": ("Answering your question…" if mode == "chat"
                             else "Drafting the technical specification…")},
                trace)
    reply = _conversational_reply(prompt, mode, design_style, context)
    elapsed = time.time() - t0
    _emit_event({"step": "done",
                 "message": "Response ready."}, trace)
    print(f"[generate-project] mode={mode} prompt={prompt!r} | {elapsed:.1f}s")

    response = {
        "status": "success",
        "mode": mode,
        "message": reply,
        "connectors": connectors or [],
        "custom_connectors": custom_connectors or [],
        "mcp_servers": mcp_servers or [],
        "design_style": design_style,
        "trace": trace,
        "files": [],
        "preview_url": PREVIEW_URL,
    }
    if mode == "plan":
        response["design_directions"] = DESIGN_DIRECTIONS
    return response


def _record_project_in_supabase(token: str, user_id: str, project_id: str,
                                 title: str, prompt: str,
                                 files: list) -> None:
    """Upsert the generated project's row into the Supabase `projects`
    table — metadata AND the full file snapshot as JSON in the existing
    `files` text column. Service-role key bypasses RLS when configured
    (production inserts were 403ing on "new row violates row-level security
    policy"); the caller's JWT is the fallback. Fail-soft: the disk
    workspace remains the hot store; the row is the durable copy that
    survives Render's ephemeral-disk wipes (and what /load restores from).
    Returns True when the row actually landed so the response can flag
    unsaved projects."""
    if not (SUPABASE_URL and SUPABASE_ANON_KEY and token and user_id):
        print("[projects] Supabase not configured — skipping metadata insert")
        return False
    try:
        resp = httpx.post(
            f"{SUPABASE_URL}/rest/v1/projects",
            headers={
                **_sb_headers(token),
                "Content-Type": "application/json",
                # id is the PK — re-running a slug reuses the row.
                "Prefer": "resolution=merge-duplicates",
            },
            json={
                "id": project_id,
                "user_id": user_id,
                "title": title[:200],
                "prompt": prompt[:2000],
                "files": json.dumps(files or []),
            },
            timeout=20,
        )
        saved = resp.status_code in (200, 201)
        if not saved:
            print(f"[projects] Supabase insert failed: "
                  f"{resp.status_code} {resp.text[:200]}")
        return saved
    except Exception as exc:  # httpx.HTTPError + InvalidURL(ValueError) etc.
        # Fail-soft by contract: schema-cache, RLS, network and config
        # errors must never crash the generation pipeline. Disk workspace
        # stays the file store; the listing falls back to it.
        print(f"[projects] Supabase insert error (ignored): {exc}")
        return False


@app.post("/generate-project")
def generate_project(payload: dict, authorization: Optional[str] = Header(default=None)):
    """Authenticated generation: 3-agent pipeline -> generated repository.

    1. Requires `Authorization: Bearer <supabase_access_token>`; 401 otherwise.
    2. Body: {"prompt": string, "mode?": "build"|"chat"|"plan",
       "connectors?": string[], "design_style?": string, "context?": string}.
       build runs the full multi-agent pipeline + disk writes; chat and plan
       return conversational / specification Markdown without touching the
       file system.
    3. Runs ArchitectAgent -> DeveloperAgent -> DebuggerAgent on the prompt,
       writing EVERY generated file to generated_projects/<project_id>/ and
       mirroring the previewable module graph into the frontend.
    4. Returns the full files array, plan, project path, execution trace and
       preview URL to the workspace UI.
    """
    token = _bearer_token(authorization)
    if not token:
        return _unauthorized(
            "Missing or malformed Authorization header. "
            "Expected: Authorization: Bearer <supabase_access_token>"
        )

    user = _verify_supabase_token(token)
    if user is None:
        return _unauthorized("Invalid or expired Supabase token")

    prompt = (payload or {}).get("prompt")
    if not prompt or not isinstance(prompt, str):
        return {
            "status": "error",
            "message": "payload must include a 'prompt' string",
        }

    connectors = _extract_connectors(payload)
    mode = _extract_mode(payload)
    design_style = _extract_str(payload, "design_style", 200)
    context = _extract_str(payload, "context", 8000)
    scope = _extract_str(payload, "scope", 200)
    custom_connectors = _extract_custom_connectors(payload)
    mcp_servers = _extract_mcp_servers(payload)
    connector_rules = _extract_connector_rules(payload)
    connector_secrets = _extract_connector_secrets(payload)

    try:
        if mode == "build":
            response = _generate_and_write(
                prompt, connectors, design_style, context,
                custom_connectors, mcp_servers, connector_rules,
                connector_secrets=connector_secrets, owner=user.get("id"),
                scope=scope)
        else:
            response = _conversational_response(
                prompt, mode, connectors, design_style, context,
                custom_connectors, mcp_servers)
    except PipelineError as exc:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(exc)},
        )

    response["user_email"] = user.get("email")
    # Every build also lands a row (metadata + full file snapshot) in the
    # Supabase `projects` table — the durable source of truth for Recents /
    # My Projects and for /load restores after a Render disk wipe. The
    # result is surfaced in the response so the UI can say so when a deploy
    # is misconfigured instead of losing projects silently.
    if mode == "build" and response.get("project_id"):
        raw = response["project_id"]
        slug = raw.split("-", 1)[1] if "-" in raw else raw
        response["project_saved"] = _record_project_in_supabase(
            token, user.get("id") or "", raw,
            slug.replace("-", " ").title() or raw, prompt,
            response.get("files", []))
    print(f"[generate-project] user={user.get('email', 'unknown')} "
          f"connectors={connectors or []}")
    return response


@app.post("/api/generate")
def handle_prompt(payload: dict):
    """Unauthenticated legacy endpoint. Same pipeline, but no Bearer check.

    Kept for backward compatibility with earlier demos/tests.
    """
    prompt = (payload or {}).get("prompt")
    if not prompt or not isinstance(prompt, str):
        return {"status": "error", "message": "payload must include a 'prompt' string"}

    connectors = _extract_connectors(payload)
    mode = _extract_mode(payload)
    design_style = _extract_str(payload, "design_style", 200)
    context = _extract_str(payload, "context", 8000)
    scope = _extract_str(payload, "scope", 200)
    custom_connectors = _extract_custom_connectors(payload)
    mcp_servers = _extract_mcp_servers(payload)
    connector_rules = _extract_connector_rules(payload)
    connector_secrets = _extract_connector_secrets(payload)

    try:
        if mode == "build":
            return _generate_and_write(
                prompt, connectors, design_style, context,
                custom_connectors, mcp_servers, connector_rules,
                connector_secrets=connector_secrets, scope=scope)
        return _conversational_response(
            prompt, mode, connectors, design_style, context,
            custom_connectors, mcp_servers)
    except PipelineError as exc:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(exc)},
        )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health/env")
def check_env():
    """Browser-visible diagnostic: what the RUNNING process actually sees.
    Visit http://localhost:8000/api/health/env to settle env-loading doubts."""
    return {
        "google_id_exists": bool(os.getenv("GOOGLE_CLIENT_ID")),
        "google_secret_exists": bool(os.getenv("GOOGLE_CLIENT_SECRET")),
        # Persistence prerequisite — when False, every build runs but no
        # project row is ever written (set SUPABASE_URL + the CURRENT anon
        # key; see frontend/.env.production for a known-good one).
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_ANON_KEY),
        "expected_env_path": str(env_path),
    }


@app.get("/api/projects")
def list_projects(limit: int = 50, authorization: Optional[str] = Header(None)):
    """List recent generated projects visible to the authenticated user.

    Requires the same Supabase Bearer token as /generate-project. Only
    owner-stamped folders are listed — a folder without an owner.json is a
    pre-tenancy legacy project and is hidden (clean slate: new accounts
    start entirely empty).
    """
    token = _bearer_token(authorization)
    user = _verify_supabase_token(token) if token else None
    if user is None:
        return _unauthorized("Sign in to list your projects.")
    owner = user.get("id")

    if not PROJECTS_ROOT.exists():
        return {"status": "success", "projects": []}
    entries: list = []
    for child in PROJECTS_ROOT.iterdir():
        if not child.is_dir():
            continue
        try:
            owner_file = child / "owner.json"
            if not owner_file.exists():
                continue  # unstamped legacy project — clean-slate policy
            meta = json.loads(owner_file.read_text())
            if meta.get("owner") != owner:
                continue  # someone else's project
            mtime = child.stat().st_mtime
            ts = datetime.fromtimestamp(mtime).isoformat()
        except (OSError, ValueError):
            continue
        # Workspace folder name: "{epoch}-{slug}"; strip the epoch prefix
        # for a human-friendly name and surface the raw slug separately.
        raw = child.name
        slug = raw.split("-", 1)[1] if "-" in raw else raw
        entries.append({
            "id": raw,
            "name": slug.replace("-", " ").title() or raw,
            "slug": slug,
            "created_at": ts,
        })
    entries.sort(key=lambda e: e["created_at"], reverse=True)
    top = entries[:max(1, min(limit, 200))]

    # Attach the stored generation prompt (Supabase metadata rows) so cards
    # can show a snippet. Fail-soft: no prompt column data -> empty string.
    prompts: dict = {}
    if SUPABASE_URL and SUPABASE_ANON_KEY and token:
        try:
            resp = httpx.get(
                f"{SUPABASE_URL}/rest/v1/projects",
                params={"select": "id,prompt", "user_id": f"eq.{owner}"},
                headers=_sb_headers(token),
                timeout=10,
            )
            if resp.status_code == 200:
                prompts = {row.get("id"): row.get("prompt") or ""
                           for row in resp.json() if isinstance(row, dict)}
        except httpx.HTTPError as exc:
            print(f"[projects] Supabase prompt lookup error: {exc}")
    for entry in top:
        entry["prompt"] = prompts.get(entry["id"], "")[:160]
    return {"status": "success", "projects": top}


def _owned_project_dir(project_id: str, authorization: Optional[str]):
    """Resolve an authenticated, caller-owned project directory.

    Returns (project_dir, user, None) on success, or (None, None,
    error_response) — shared by load / edit / delete so the auth, traversal
    and ownership rules can never drift apart. project_dir is None (with a
    valid user) when the disk folder is gone — Render's ephemeral fs loses
    it on redeploy; /load then restores from the Supabase snapshot.
    """
    token = _bearer_token(authorization)
    user = _verify_supabase_token(token) if token else None
    if user is None:
        return None, None, _unauthorized("Sign in to access your projects.")

    rel = _safe_relpath(project_id)
    project_dir = PROJECTS_ROOT / rel if rel and len(rel.parts) == 1 else None
    if project_dir is None or not project_dir.is_dir():
        # Disk gone (redeploy wipe) — the caller may still own the DB row.
        return None, user, None
    try:
        owner_file = project_dir / "owner.json"
        if not owner_file.exists():
            # unstamped legacy project — clean-slate policy
            return None, None, JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Unknown project"})
        meta = json.loads(owner_file.read_text())
        if meta.get("owner") != user.get("id"):
            return None, None, _unauthorized("This project belongs to another account.")
    except (OSError, ValueError):
        return None, None, JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Unknown project"})
    return project_dir, user, None


def _restore_project_from_supabase(project_id: str, token: str,
                                   user: dict) -> Optional[Path]:
    """Rebuild a wiped workspace folder from the project's Supabase snapshot.

    Ownership is enforced by an explicit user_id filter (the caller's id
    from the verified token) — the service-role key bypasses RLS, so the
    filter is what scopes this read. With only the anon key the RLS policy
    does the same job redundantly. The `files` column holds the JSON
    snapshot written by generation/edit; older rows hold a legacy dir path
    (never JSON) and can't restore. Re-materializing to disk re-enables
    edit/save/delete. Returns the project dir, or None when no snapshot
    exists.
    """
    if not (SUPABASE_URL and SUPABASE_ANON_KEY and token):
        return None
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/projects",
            params={"id": f"eq.{project_id}", "select": "files",
                    "user_id": f"eq.{user.get('id')}"},
            headers=_sb_headers(token),
            timeout=15,
        )
        if resp.status_code != 200:
            return None
        rows = resp.json()
        snapshot = rows[0].get("files") if rows else None
        files = json.loads(snapshot) if isinstance(snapshot, str) else None
        if not isinstance(files, list) or not files:
            return None
    except Exception as exc:
        print(f"[projects] Supabase restore failed: {exc}")
        return None

    rel = _safe_relpath(project_id)
    if not rel or len(rel.parts) != 1:
        return None
    project_dir = PROJECTS_ROOT / rel
    try:
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "owner.json").write_text(
            json.dumps({"owner": user.get("id")}))
        for f in files:
            if not isinstance(f, dict):
                continue
            file_rel = _safe_relpath(str(f.get("path", "")))
            content = f.get("content")
            if not file_rel or not isinstance(content, str):
                continue
            target = project_dir / file_rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
    except OSError as exc:
        print(f"[projects] restore write failed: {exc}")
        return None
    print(f"[projects] restored {len(files)} files from Supabase snapshot "
          f"into {project_dir.name}")
    return project_dir


def _read_project_files(project_dir: Path) -> list:
    """All text files of a workspace folder as [{path, content}]."""
    files: list = []
    for path in sorted(project_dir.rglob("*")):
        if not path.is_file() or path.name == "owner.json":
            continue
        try:
            files.append({"path": path.relative_to(project_dir).as_posix(),
                          "content": path.read_text(encoding="utf-8")})
        except (UnicodeDecodeError, OSError):
            continue  # binary files (images etc.) are not canvas material
    return files


def _snapshot_files_to_supabase(token: str, project_id: str,
                                files: list,
                                user_id: Optional[str] = None) -> None:
    """PATCH only the file snapshot of an existing project row (edit /
    Monaco-save paths). A PATCH — not the generation upsert — so title and
    the original prompt are never clobbered. The user_id filter preserves
    ownership semantics when the service-role key bypasses RLS. Fail-soft."""
    if not (SUPABASE_URL and SUPABASE_ANON_KEY and token):
        return
    params = {"id": f"eq.{project_id}"}
    if user_id:
        params["user_id"] = f"eq.{user_id}"
    try:
        resp = httpx.patch(
            f"{SUPABASE_URL}/rest/v1/projects",
            params=params,
            headers={**_sb_headers(token),
                     "Content-Type": "application/json"},
            json={"files": json.dumps(files or [])},
            timeout=20,
        )
        if resp.status_code not in (200, 204):
            print(f"[projects] Supabase snapshot failed: "
                  f"{resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        print(f"[projects] Supabase snapshot error (ignored): {exc}")


def _delete_supabase_project_row(authorization: Optional[str],
                                 project_id: str,
                                 user_id: Optional[str] = None) -> None:
    """Remove the project's metadata row (fail-soft). The user_id filter
    scopes the delete when the service-role key bypasses RLS; with the anon
    key the RLS policy enforces the same thing.
    """
    if not (SUPABASE_URL and SUPABASE_ANON_KEY):
        return
    token = _bearer_token(authorization)
    if not token:
        return
    params = {"id": f"eq.{project_id}"}
    if user_id:
        params["user_id"] = f"eq.{user_id}"
    try:
        resp = httpx.delete(
            f"{SUPABASE_URL}/rest/v1/projects",
            params=params,
            headers=_sb_headers(token),
            timeout=10,
        )
        if resp.status_code not in (200, 204):
            print(f"[projects] Supabase delete failed: "
                  f"{resp.status_code} {resp.text[:200]}")
    except httpx.HTTPError as exc:
        print(f"[projects] Supabase delete error: {exc}")


@app.get("/api/projects/{project_id}/load")
def load_project(project_id: str, authorization: Optional[str] = Header(None)):
    """Load a project's files back into the workspace canvas.

    Same auth/ownership rules as the listing: an owner-stamped folder loads
    only for its owner; an unstamped (legacy) folder is not loadable. Re-
    mirrors the project into the Vite preview so /preview shows it. When the
    disk folder is gone (Render redeploy wiped the ephemeral fs) the files
    are restored from the project's Supabase snapshot instead of 404ing.
    """
    project_dir, user, err = _owned_project_dir(project_id, authorization)
    if err:
        return err
    if project_dir is None:
        # Disk gone — restore from the durable Supabase row (RLS-scoped).
        project_dir = _restore_project_from_supabase(
            project_id, _bearer_token(authorization) or "", user)
        if project_dir is None:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Unknown project"})

    files = _read_project_files(project_dir)
    entry = _select_entry(files)
    if entry:
        _refresh_preview(files, entry["path"])

    raw = project_dir.name
    slug = raw.split("-", 1)[1] if "-" in raw else raw
    return {
        "status": "success",
        "project_id": raw,
        "name": slug.replace("-", " ").title() or raw,
        "files": files,
        "entry_path": entry["path"] if entry else None,
        "generated_code": (entry["content"] if entry
                           else files[0]["content"] if files else ""),
    }


@app.post("/api/projects/{project_id}/edit")
def edit_project(project_id: str, payload: dict,
                 authorization: Optional[str] = Header(None)):
    """Incremental edit ("Edit with AI"): patch the EXISTING project
    directory in place — no new project, no new project_id.

    Body: {"prompt": "<change instruction>"}. The Debugger/Edit agent
    rewrites only the affected files; everything else is preserved. Only
    files that already exist on disk are patchable (paths the model invents
    are dropped). Files failing the structural balance check keep the
    original content. Returns the full updated file set like /load.
    """
    project_dir, user, err = _owned_project_dir(project_id, authorization)
    if err:
        return err
    if project_dir is None:
        project_dir = _restore_project_from_supabase(
            project_id, _bearer_token(authorization) or "", user)
        if project_dir is None:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Unknown project"})

    instruction = (payload or {}).get("prompt")
    if not instruction or not isinstance(instruction, str):
        return {"status": "error",
                "message": "payload must include a 'prompt' string"}

    trace: list = []
    files = _read_project_files(project_dir)
    if not files:
        return JSONResponse(status_code=404,
                            content={"status": "error", "message": "Unknown project"})

    _emit_event({"step": "edit:started",
                 "message": f"Reading {len(files)} existing files…"}, trace)
    _emit_event({"step": "debugger:patching",
                 "message": "Patching the existing project in place…"}, trace)
    debugger = _get_agents()["debugger"]
    changed = debugger.apply_edit(files, instruction)
    if not changed:
        # apply_edit logs the full chain to the terminal; give the user the
        # final specific reason instead of a generic "try rephrasing".
        reason = debugger.last_edit_error or "the agent produced no usable output"
        print(f"[edit-project] id={project_id} instruction={instruction!r} "
              f"failed: {reason}")
        return JSONResponse(
            status_code=500,
            content={"status": "error",
                     "message": f"The edit agent couldn't apply that change: "
                                f"{reason}. Try rephrasing it."})

    merged = {f["path"]: dict(f) for f in files}
    written_paths = []
    for f in changed:
        rel = _safe_relpath(f["path"])
        if not rel or rel.as_posix() not in merged:
            continue  # model invented a path — only existing files patch
        merged[rel.as_posix()]["content"] = f["content"]
        (project_dir / rel).write_text(f["content"], encoding="utf-8")
        written_paths.append(rel.as_posix())
        _emit_event({"step": "file:written",
                     "message": f"Patched {rel.as_posix()}"}, trace)
    if not written_paths:
        return JSONResponse(
            status_code=500,
            content={"status": "error",
                     "message": "The edit agent returned changes only for "
                                "files that don't exist in this project. "
                                "Try rephrasing it."})
    written = len(written_paths)

    # Conversational pair-programmer reply for the chat panel (never lies
    # about scope: it only knows the files actually patched).
    assistant_message = debugger.conversational_summary(
        instruction, sorted(written_paths))
    if not assistant_message:
        suffix = "s" if written != 1 else ""
        names = ", ".join(sorted(written_paths)[:3])
        assistant_message = (
            f"Applied your change — updated {written} file{suffix} "
            f"({names}). What would you like me to refine next?")

    _emit_event({"step": "debugger:completed",
                 "message": f"Edited {written} file"
                 + ("s" if written != 1 else "") + " in place."}, trace)
    files = list(merged.values())
    entry = _select_entry(files)
    if entry:
        _refresh_preview(files, entry["path"])

    raw = project_dir.name
    slug = raw.split("-", 1)[1] if "-" in raw else raw
    # Snapshot the post-edit state — the disk copy dies with the deploy.
    _snapshot_files_to_supabase(
        _bearer_token(authorization) or "", raw, list(merged.values()),
        (user or {}).get("id"))
    print(f"[edit-project] id={raw} | {written} files patched in place")
    return {
        "status": "success",
        "project_id": raw,
        "name": slug.replace("-", " ").title() or raw,
        "files": files,
        "entry_path": entry["path"] if entry else None,
        "generated_code": (entry["content"] if entry
                           else files[0]["content"] if files else ""),
        "assistant_message": assistant_message,
        "trace": trace,
    }


@app.put("/api/projects/{project_id}/files")
def update_project_file(project_id: str, payload: dict,
                        authorization: Optional[str] = Header(None)):
    """Monaco editor save: write an updated file back to the caller-owned
    project's workspace directory on disk.

    Body: {"path": "<relative file path>", "content": "<new text>"}. Only
    files that already exist in the project are writable — the shared
    safe-relpath guard blocks traversal, and paths the client invents 404.
    The Vite preview mirror is refreshed so /preview picks up the edit
    without a page reload.
    """
    project_dir, user, err = _owned_project_dir(project_id, authorization)
    if err:
        return err
    if project_dir is None:
        project_dir = _restore_project_from_supabase(
            project_id, _bearer_token(authorization) or "", user)
        if project_dir is None:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Unknown project"})

    raw_path = (payload or {}).get("path")
    content = (payload or {}).get("content")
    if not isinstance(raw_path, str) or not isinstance(content, str):
        return JSONResponse(
            status_code=400,
            content={"status": "error",
                     "message": "payload must include 'path' and 'content' strings"},
        )

    rel = _safe_relpath(raw_path)
    # owner.json is the ownership record itself — never client-writable (a
    # "../owner.json" style path collapses to it via _safe_relpath).
    target = (project_dir / rel
              if rel and rel.as_posix() != "owner.json" else None)
    if target is None or not target.is_file():
        return JSONResponse(status_code=404,
                            content={"status": "error",
                                     "message": f"Unknown file: {raw_path}"})

    target.write_text(content, encoding="utf-8")
    # Keep the live preview in sync with the saved edit.
    files = _read_project_files(project_dir)
    entry = _select_entry(files)
    if entry:
        _refresh_preview(files, entry["path"])
    _snapshot_files_to_supabase(
        _bearer_token(authorization) or "", project_id, files,
        (user or {}).get("id"))
    print(f"[update-file] id={project_id} file={rel.as_posix()} saved from Monaco")
    return {"status": "success", "path": rel.as_posix()}


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str,
                   authorization: Optional[str] = Header(None)):
    """Delete a project: remove its disk workspace folder and its Supabase
    metadata row. Owner-only (same ownership rules as load/edit)."""
    project_dir, user, err = _owned_project_dir(project_id, authorization)
    if err:
        return err
    if project_dir is None:
        # Disk already gone — still drop the durable Supabase row (user_id
        # filter scopes it to the caller; a missing row is a silent no-op).
        _delete_supabase_project_row(authorization, project_id,
                                     (user or {}).get("id"))
        return {"status": "success", "project_id": project_id}

    raw = project_dir.name
    try:
        shutil.rmtree(project_dir)
    except OSError as exc:
        return JSONResponse(status_code=500,
                            content={"status": "error",
                                     "message": f"Failed to delete: {exc}"})
    _delete_supabase_project_row(authorization, raw, (user or {}).get("id"))
    print(f"[delete-project] id={raw} removed from disk")
    return {"status": "success", "project_id": raw}


@app.post("/api/projects/{project_id}/duplicate")
def duplicate_project(project_id: str,
                       authorization: Optional[str] = Header(None)):
    """Duplicate a project: copy its disk workspace under a fresh id,
    re-stamp ownership, and mirror the Supabase metadata row (including
    the stored prompt). Owner-only (same rules as load/edit/delete)."""
    project_dir, user, err = _owned_project_dir(project_id, authorization)
    if err:
        return err
    if project_dir is None:
        project_dir = _restore_project_from_supabase(
            project_id, _bearer_token(authorization) or "", user)
        if project_dir is None:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Unknown project"})

    raw = project_dir.name
    slug = raw.split("-", 1)[1] if "-" in raw else raw
    token = _bearer_token(authorization) or ""
    owner = (user or {}).get("id")
    if not owner:
        return _unauthorized("Sign in to duplicate your projects.")

    base_slug = slug if slug.endswith("-copy") else f"{slug}-copy"
    new_dir = None
    for attempt in range(5):
        suffix = base_slug if attempt == 0 else f"{base_slug}{attempt + 1}"
        candidate = PROJECTS_ROOT / f"{int(time.time())}-{suffix}"
        if not candidate.exists():
            new_dir = candidate
            break
    if new_dir is None:
        return JSONResponse(status_code=500,
                            content={"status": "error",
                                     "message": "Could not allocate a duplicate id"})

    shutil.copytree(project_dir, new_dir)
    (new_dir / "owner.json").write_text(json.dumps({"owner": owner}))

    # Carry the original generation prompt over (user_id filter scopes the
    # read under the service-role key; RLS does it under the anon key).
    prompt = ""
    if SUPABASE_URL and SUPABASE_ANON_KEY and token:
        try:
            resp = httpx.get(
                f"{SUPABASE_URL}/rest/v1/projects",
                params={"id": f"eq.{raw}", "select": "prompt",
                        "user_id": f"eq.{owner}"},
                headers=_sb_headers(token),
                timeout=10,
            )
            if resp.status_code == 200:
                rows = resp.json()
                prompt = (rows[0].get("prompt") or "") if rows else ""
        except httpx.HTTPError as exc:
            print(f"[projects] prompt fetch during duplicate failed: {exc}")

    title = base_slug.replace("-", " ").title()
    _record_project_in_supabase(token, owner, new_dir.name, title,
                                prompt, _read_project_files(new_dir))
    print(f"[duplicate-project] {raw} -> {new_dir.name}")
    return {"status": "success", "project_id": new_dir.name, "name": title}


@app.post("/api/deploy")
def deploy(payload: dict):
    """Subdomain deployment stub (Module 5).

    Accepts {project_id, project_slug, generated_code, files} and returns a
    deploy URL of the form https://<slug>.craftai.app. Persisting the file
    set to S3/R2 and provisioning the wildcard subdomain route lives behind a
    real deploy worker (TODO); for now the endpoint is enough to drive the
    UI flow and let the frontend render a live URL badge.
    """
    slug = re.sub(r"[^a-z0-9-]+", "-",
                  str((payload or {}).get("project_slug")
                      or (payload or {}).get("project_id")
                      or "project").lower()).strip("-")[:60] or "project"
    url = f"https://{slug}.craftai.app"
    return JSONResponse(
        status_code=200,
        content={"status": "success", "slug": slug, "url": url},
        headers={"X-Deploy-Url": url},
    )


@app.post("/api/publish/github")
def publish_github(payload: dict, authorization: Optional[str] = Header(None)):
    """Push the generated monorepo to the user's GitHub as a PRIVATE repo.

    Body: {project_slug, github_token, files: [{path, content}]}. The token
    is used for this request only and is NEVER persisted server-side; if the
    body token is absent, the backend's GITHUB_TOKEN env stands in for local
    demos. The whole tree lands on `main` as ONE commit via the Git Database
    API (blobs -> tree -> commit -> ref update) so a 36-file monorepo stays
    far under the rate limits.
    """
    slug = re.sub(r"[^a-z0-9-]+", "-",
                  str((payload or {}).get("project_slug")
                      or "project").lower()).strip("-")[:100] or "project"
    gh_token = (payload or {}).get("github_token") or os.getenv("GITHUB_TOKEN")
    if not gh_token or not isinstance(gh_token, str):
        return JSONResponse(status_code=401,
                            content={"status": "error",
                                     "message": "A GitHub Personal Access Token "
                                                "with the repo scope is required "
                                                "to publish. Connect GitHub in the "
                                                "publish dialog first."})
    raw_files = (payload or {}).get("files")
    if not isinstance(raw_files, list) or not raw_files:
        return {"status": "error", "message": "payload must include a 'files' array"}

    accepted: list = []
    seen_paths: set = set()
    for f in raw_files[:200]:
        if not isinstance(f, dict) or not isinstance(f.get("content"), str):
            continue
        rel = _safe_relpath(f.get("path", ""))
        if rel is None or rel.as_posix() in seen_paths:
            continue
        seen_paths.add(rel.as_posix())
        accepted.append({"path": rel.as_posix(), "content": f["content"]})
    if not accepted:
        return {"status": "error", "message": "no files with safe relative paths"}

    headers = {"Authorization": f"Bearer {gh_token}",
               "Accept": "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28"}
    api = "https://api.github.com"

    def gh_fail(resp: httpx.Response, stage: str) -> JSONResponse:
        detail = (resp.json().get("message") or resp.text)[:300] if resp.text else ""
        print(f"[publish-github] {stage} failed: HTTP {resp.status_code} {detail}")
        return JSONResponse(status_code=502,
                            content={"status": "error",
                                     "message": f"GitHub {stage} failed "
                                                f"(HTTP {resp.status_code}): {detail}"})

    # 1) Token check + owner login (also surfaces 401 early with an honest error).
    user = httpx.get(f"{api}/user", headers=headers, timeout=15)
    if user.status_code == 401:
        return JSONResponse(status_code=401,
                            content={"status": "error",
                                     "message": "GitHub token is invalid or expired. "
                                                "Generate a new PAT with the repo scope."})
    if user.status_code >= 400:
        return gh_fail(user, "auth check")
    login = user.json().get("login", "")
    repo_url = f"https://github.com/{login}/{slug}"

    # 2) Create the private repo. HTTP 422 means the name exists — reuse the
    #    caller's own repo when it does, or report honestly when it belongs
    #    to someone else / was renamed.
    created = httpx.post(f"{api}/user/repos", headers=headers, timeout=30,
                         json={"name": slug, "private": True, "auto_init": True,
                               "description": "Generated with CraftAI"})
    if created.status_code == 422:
        existing = httpx.get(f"{api}/repos/{login}/{slug}", headers=headers, timeout=15)
        if existing.status_code >= 400:
            return JSONResponse(status_code=409,
                                content={"status": "error",
                                         "message": f"'{slug}' can't be created — the name "
                                                    f"is taken (try another slug)."})
    elif created.status_code >= 400:
        return gh_fail(created, "repository creation")

    # 3) Base commit sha on main (auto_init guarantees it exists).
    ref = httpx.get(f"{api}/repos/{login}/{slug}/git/ref/heads/main",
                    headers=headers, timeout=15)
    base_sha = None
    if ref.status_code == 200:
        base_sha = ref.json().get("object", {}).get("sha")

    # 4) One blob per file, then ONE tree carrying the whole monorepo.
    tree_entries: list = []
    for f in accepted:
        blob = httpx.post(f"{api}/repos/{login}/{slug}/git/blobs", headers=headers,
                          timeout=20, json={"content": f["content"], "encoding": "utf-8"})
        if blob.status_code >= 400:
            return gh_fail(blob, f"blob upload ({f['path']})")
        tree_entries.append({"path": f["path"], "mode": "100644",
                             "type": "blob", "sha": blob.json().get("sha")})
    if not tree_entries:
        return {"status": "error", "message": "no file blobs could be created"}

    tree_body: dict = {"tree": tree_entries}
    if base_sha:
        tree_body["base_tree"] = base_sha
    tree = httpx.post(f"{api}/repos/{login}/{slug}/git/trees", headers=headers,
                      timeout=30, json=tree_body)
    if tree.status_code >= 400:
        return gh_fail(tree, "tree creation")

    commit_body: dict = {"message": "Publish via CraftAI — full monorepo push",
                         "tree": tree.json().get("sha")}
    if base_sha:
        commit_body["parents"] = [base_sha]
    commit = httpx.post(f"{api}/repos/{login}/{slug}/git/commits", headers=headers,
                        timeout=20, json=commit_body)
    if commit.status_code >= 400:
        return gh_fail(commit, "commit creation")
    commit_sha = commit.json().get("sha", "")

    # 5) Fast-forward main (or create it on a bizarre empty repo).
    if base_sha:
        upd = httpx.patch(f"{api}/repos/{login}/{slug}/git/refs/heads/main",
                          headers=headers, timeout=20, json={"sha": commit_sha})
        if upd.status_code >= 400:
            return gh_fail(upd, "main branch update")
    else:
        new_ref = httpx.post(f"{api}/repos/{login}/{slug}/git/refs", headers=headers,
                             timeout=20, json={"ref": "refs/heads/main", "sha": commit_sha})
        if new_ref.status_code >= 400:
            return gh_fail(new_ref, "main branch creation")

    print(f"[publish-github] {len(accepted)} files -> github.com/{login}/{slug} "
          f"({commit_sha[:7]})")

    # ---- Auto-deploy to Vercel immediately after the push: create project
    # (linked to the GitHub repo), assign the wildcard subdomain, trigger a
    # production build. Failure NEVER fails the publish — the user keeps the
    # GitHub link and a warning explains what didn't happen.
    live_url: Optional[str] = None
    deploy_warning: Optional[str] = ""
    gh_repo = f"{login}/{slug}"
    if not VERCEL_API_TOKEN:
        deploy_warning = ("Auto-deploy skipped: VERCEL_API_TOKEN is not "
                          "configured on the backend.")
    else:
        vheaders = {"Authorization": f"Bearer {VERCEL_API_TOKEN}",
                    "Content-Type": "application/json"}
        vq = f"?teamId={VERCEL_TEAM_ID}" if VERCEL_TEAM_ID else ""
        vapi = "https://api.vercel.com"
        # Monorepo output: the Vite app to host lives in /frontend.
        root_dir = ("frontend"
                    if any(f["path"].startswith("frontend/") for f in accepted)
                    else "")
        try:
            # A) Create (or reuse) the project, linked to the GitHub repo.
            proj_body: dict = {"name": slug, "framework": "vite"}
            if root_dir:
                proj_body["rootDirectory"] = root_dir
            proj_body["gitRepository"] = {"type": "github", "repo": gh_repo}
            proj = httpx.post(f"{vapi}/v10/projects{vq}", headers=vheaders,
                              timeout=30, json=proj_body)
            if proj.status_code >= 400 and proj.status_code != 409:
                raise RuntimeError(f"project create HTTP {proj.status_code}: "
                                   f"{proj.text[:200]}")

            # B) Assign the wildcard subdomain (maps to *.craftai.diy DNS).
            dom = httpx.post(f"{vapi}/v10/projects/{slug}/domains{vq}",
                             headers=vheaders, timeout=20,
                             json={"name": f"{slug}.craftai.diy"})
            if dom.status_code >= 400 and dom.status_code != 409:
                raise RuntimeError(f"domain assign HTTP {dom.status_code}: "
                                   f"{dom.text[:200]}")

            # C) Trigger the production build from the pushed main branch.
            dep = httpx.post(f"{vapi}/v13/deployments{vq}", headers=vheaders,
                             timeout=30,
                             json={"name": slug, "target": "production",
                                   "gitSource": {"type": "github",
                                                 "repo": gh_repo,
                                                 "ref": "main"}})
            if dep.status_code >= 400:
                raise RuntimeError(f"deployment HTTP {dep.status_code}: "
                                   f"{dep.text[:200]}")
            deploy_url = dep.json().get("url", "")
            live_url = f"https://{slug}.craftai.diy"
            print(f"[publish-github] vercel deploy building: "
                  f"{deploy_url} -> {live_url}")
        except (httpx.HTTPError, RuntimeError, ValueError) as exc:
            deploy_warning = (f"Auto-deploy to Vercel failed: {exc} — "
                              f"your code is safe on GitHub.")
            print(f"[publish-github] {deploy_warning}")

    return {"status": "success", "slug": slug, "repo_url": repo_url,
            "files_pushed": len(accepted), "commit": commit_sha[:7],
            "live_url": live_url or None,
            "deploy_warning": deploy_warning or None}


if __name__ == "__main__":
    import uvicorn

    # Railway (etc.) assigns the port via $PORT; bind 0.0.0.0 for containers.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=port, reload=port == 8000)