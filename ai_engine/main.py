"""CraftAI FastAPI entrypoint — multi-agent generation pipeline.

Run from the project root with either:
    uvicorn main:app --reload          # root wrapper -> this app
    uvicorn ai_engine.main:app --reload
"""
import os
import sys
import time
from pathlib import Path

# Project root (parent of this ai_engine folder). Put it on sys.path so the
# `ai_engine.*` absolute imports below resolve no matter where uvicorn is
# launched from. Also pin CWD to root so relative paths (prompts, generated
# files) resolve.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_engine.agents.architect import ArchitectAgent
from ai_engine.agents.debugger import DebuggerAgent
from ai_engine.agents.developer import DeveloperAgent

app = FastAPI(title="CraftAI Engine")

# Allow the Next.js frontend on port 3000 to call this backend from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The generated application overwrites the frontend workspace page, so the
# preview is the frontend itself.
FRONTEND_PAGE = ROOT / "craftai-frontend" / "src" / "app" / "page.tsx"

# Agents are created lazily on the first request: DebuggerAgent.__init__
# raises without NVIDIA_API_KEY, and that must not crash server startup.
_agents = None


def _get_agents():
    global _agents
    if _agents is None:
        _agents = {
            "architect": ArchitectAgent(),
            "developer": DeveloperAgent(),
            "debugger": DebuggerAgent(),
        }
    return _agents


@app.post("/api/generate")
def handle_prompt(payload: dict):
    """Run the full 3-agent pipeline and write the generated app to disk.

    Sync (not async) so the blocking LLM calls run in FastAPI's threadpool
    instead of freezing the event loop.
    """
    prompt = (payload or {}).get("prompt")
    if not prompt or not isinstance(prompt, str):
        return {"status": "error", "message": "payload must include a 'prompt' string"}

    agents = _get_agents()

    # Stage 1 — Architect (Groq): structured JSON plan.
    t0 = time.time()
    plan = agents["architect"].plan_architecture(prompt)
    t_arch = time.time() - t0

    # Stage 2 — Developer (Ollama): raw page.tsx from the plan.
    t0 = time.time()
    code = agents["developer"].generate_code(plan)
    t_dev = time.time() - t0
    if not code:
        return {"status": "error", "message": "Developer agent returned empty code"}

    # Stage 3 — Debugger (NVIDIA): hybrid fast-check; LLM repair only when
    # the structural check fails and thorough mode is requested. Demo path
    # is sub-millisecond here.
    t0 = time.time()
    final_code = agents["debugger"].validate_and_fix_code(plan, code, fast_mode=True)
    t_debug = time.time() - t0

    # Physical file generation: overwrite the workspace page with the
    # actual generated application.
    FRONTEND_PAGE.parent.mkdir(parents=True, exist_ok=True)
    FRONTEND_PAGE.write_text(final_code, encoding="utf-8")

    print(f"[pipeline] prompt={prompt!r} | architect={t_arch:.1f}s "
          f"developer={t_dev:.1f}s debugger={t_debug:.1f}s "
          f"| wrote {FRONTEND_PAGE} ({len(final_code.splitlines())} lines)")

    return {
        "status": "success",
        "plan": plan,
        "generated_code": final_code,
        "preview_url": "http://localhost:3000",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=8000, reload=True)