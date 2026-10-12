"""Smoke test for PUT /api/projects/{id}/files (Monaco save).

Run:  venv/bin/python ai_engine/test_update_file.py
Cleans up its own fixture afterwards.
"""
import json
import shutil
import time

from fastapi.testclient import TestClient

from ai_engine import main as m
from ai_engine.main import app, PROJECTS_ROOT, PREVIEW_PROJECT_DIR

# Real Supabase credentials are configured locally, so a fake token would
# fail the live auth server. The auth path is shared with load/edit/delete;
# stub the verifier to exercise the file-write logic itself.
m._verify_supabase_token = lambda token: {"id": "local", "email": "t@t"}

pid = f"{int(time.time())}-smoketest"
d = PROJECTS_ROOT / pid
(d / "src").mkdir(parents=True)
(d / "owner.json").write_text(json.dumps({"owner": "local"}))
(d / "src" / "App.tsx").write_text("old\n")

try:
    c = TestClient(app)
    H = {"Authorization": "Bearer x"}

    r = c.put(f"/api/projects/{pid}/files", headers=H,
              json={"path": "src/App.tsx", "content": "// new\n"})
    assert r.json() == {"status": "success", "path": "src/App.tsx"}, r.text
    assert (d / "src" / "App.tsx").read_text().strip() == "// new"
    print("save + disk write: ok")

    assert c.put(f"/api/projects/{pid}/files", headers=H,
                 json={"path": "../owner.json", "content": "x"}).status_code == 404
    print("traversal blocked: ok")

    assert c.put(f"/api/projects/{pid}/files", headers=H,
                 json={"path": "src/Invented.tsx", "content": "x"}).status_code == 404
    print("invented path rejected: ok")

    assert c.put(f"/api/projects/{pid}/files",
                 json={"path": "src/App.tsx", "content": "x"}).status_code == 401
    print("auth required: ok")
finally:
    shutil.rmtree(d, ignore_errors=True)
    shutil.rmtree(PREVIEW_PROJECT_DIR, ignore_errors=True)