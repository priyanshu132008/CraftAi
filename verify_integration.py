"""End-to-end integration verification for the CraftAI stack.

Verifies the full demo flow:
  Supabase login -> Bearer token -> POST /generate-project (3-agent
  pipeline) -> multi-file repository written to generated_projects/<id>/
  and preview mirror under frontend/src/generated/.

Run with the repo venv:  ./venv/bin/python verify_integration.py
Requires uvicorn (main:app) on :8000; the Vite preview server on :3000
is checked opportunistically but not required.
"""
import json
import sys
import time
from pathlib import Path

import httpx


def request_with_retry(client: httpx.Client, retries: int = 3, **kwargs):
    """Send an httpx request, retrying on transient DNS/connect errors.
    (This machine sits behind NAT64 and lookups occasionally fail.)"""
    last = None
    for attempt in range(retries):
        try:
            return client.request(**kwargs)
        except httpx.TransportError as e:
            last = e
            print(f"    (transport error, attempt {attempt + 1}/{retries}: {e})")
            time.sleep(1.5)
    raise last

ROOT = Path(__file__).resolve().parent
BACKEND = "http://localhost:8000"
FRONTEND = "http://localhost:3000"
# The Vite app hot-compiles the backend-written preview shim, which
# re-exports the entry from the mirrored project under src/generated/project/.
PREVIEW_ENTRY = ROOT / "frontend" / "src" / "generated" / "GeneratedPage.tsx"

# Supabase project (same values as backend-craftai/.env).
SUPABASE_URL = "https://xdtmtvijeegajctbgt.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "InhkdG10dmlqZWVnYWpjdHB0Ymd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDEzMDYs"
    "ImV4cCI6MjEwNTU3NzMwNn0.tmEx09hVYr12eagkfOYfkTZRKTsSgNv3D0-g43fdphU"
)

PASSED = []
FAILED = []


def check(name: str, ok: bool, detail: str = ""):
    (PASSED if ok else FAILED).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    client = httpx.Client(timeout=300)

    print("[1] Backend health")
    try:
        r = client.get(f"{BACKEND}/api/health")
        check("GET /api/health -> 200 ok", r.status_code == 200 and r.json().get("status") == "ok")
    except httpx.HTTPError as e:
        check("backend reachable", False, str(e))
        print("Start the backend first: ./venv/bin/python -m uvicorn main:app --port 8000")
        return 1

    print("[2] Supabase login (test@craftai.com)")
    try:
        r = request_with_retry(
            client,
            method="POST",
            url=f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_ANON_KEY},
            json={"email": "test@craftai.com", "password": "test123"},
        )
        token = r.json().get("access_token", "")
        check("password grant returns access_token", r.status_code == 200 and bool(token),
              f"HTTP {r.status_code}")
    except httpx.HTTPError as e:
        check("Supabase login", False, str(e))
        return 1
    if not token:
        print("No token — aborting.")
        return 1

    print("[3] Auth gate on /generate-project")
    r = client.post(f"{BACKEND}/generate-project", json={"prompt": "test"})
    check("missing token -> 401", r.status_code == 401)

    r = client.post(
        f"{BACKEND}/generate-project",
        headers={"Authorization": "Bearer not-a-real-token"},
        json={"prompt": "test"},
    )
    check("garbage token -> 401", r.status_code == 401)

    print("[4] Full authenticated generation (3-agent pipeline, may take ~1-2 min)")
    r = request_with_retry(
        client,
        method="POST",
        url=f"{BACKEND}/generate-project",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt": (
                "Build a sleek dark landing page for CraftAI, an AI app-generation "
                "studio: animated hero, features grid, pricing and footer"
            ),
            "connectors": ["supabase", "stripe", "discord_webhook"],
        },
    )
    ok = r.status_code == 200 and r.json().get("status") == "success"
    check("authenticated generation -> 200 success", ok, f"HTTP {r.status_code}")

    if ok:
        data = r.json()
        files = data.get("files", [])
        paths = [f.get("path") for f in files]
        check("response has plan", isinstance(data.get("plan"), dict))
        check("response has generated_code (entry content)", bool(data.get("generated_code")))
        check("files[] contains multiple generated files", len(files) > 1,
              f"{len(files)} files: {paths}")
        check("files[] includes package.json", "package.json" in paths)
        check("files[] includes React entry src/App.tsx", "src/App.tsx" in paths)
        check("response has entry_path + preview_url",
              bool(data.get("entry_path")) and bool(data.get("preview_url")))
        check("connectors echoed back",
              set(data.get("connectors", [])) == {"supabase", "stripe", "discord_webhook"},
              f"got {data.get('connectors')!r}")
        check("files[] includes the per-connector lib files",
              {"src/lib/supabase.ts", "src/lib/stripe.ts",
               "src/lib/discord.ts"} <= set(paths),
              f"lib files: {[p for p in paths if p.startswith('src/lib/')]}")

        project_dir = ROOT / data.get("projectPath", "")
        check("projectPath points inside generated_projects/",
              data.get("projectPath", "").startswith("generated_projects/"))
        written = [project_dir / p for p in paths if p]
        check("EVERY file in files[] exists on disk",
              project_dir.is_dir() and all(w.is_file() for w in written),
              f"{sum(w.is_file() for w in written)}/{len(written)} present")
        lib_dir = project_dir / "src" / "lib"
        check("per-connector lib files on disk reference their services",
              all((lib_dir / n).is_file() and s in (lib_dir / n).read_text()
                  for n, s in (("supabase.ts", "supabase"),
                               ("stripe.ts", "stripe"),
                               ("discord.ts", "discord"))))

        after = PREVIEW_ENTRY.read_text() if PREVIEW_ENTRY.exists() else ""
        check("preview entry (GeneratedPage.tsx) points at the mirrored project",
              "let entryPath = './project/" in after,
              f"{len(after.splitlines())} lines")
        mirrored = ROOT / "frontend" / "src" / "generated" / "project" / "src" / "App.tsx"
        check("entry mirrored into frontend/src/generated/project/",
              mirrored.is_file())
        check("response carries authenticated user email",
              data.get("user_email") == "test@craftai.com",
              f"got {data.get('user_email')!r}")

        entry_code = data["generated_code"]
        uses_lib = "motion" in entry_code or any("motion" in f.get("content", "")
                                                for f in files)
        check("component library patterns present (framer-motion motion.*)", uses_lib)

    print("[5] Frontend / preview (opportunistic)")
    try:
        r = client.get(f"{FRONTEND}/preview", follow_redirects=True)
        check("GET http://localhost:3000/preview -> 200", r.status_code == 200)
        check("preview renders generated markup",
              "use client" not in r.text[:2000] and len(r.text) > 1000)
    except httpx.HTTPError as e:
        print(f"  SKIP  frontend not running ({e})")

    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        print("Failed:", ", ".join(FAILED))
    return 0 if not FAILED else 1


if __name__ == "__main__":
    sys.exit(main())