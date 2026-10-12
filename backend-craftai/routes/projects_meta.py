"""Project list endpoint backed by the Supabase `projects` table.

This table's live schema (supabase_migration_projects.sql: id, user_id,
title, prompt, files, created_at) belongs to the AI Engine's workspace
metadata — NOT the incompatible `Project` SQLAlchemy model in
models/project.py. This router talks to Supabase PostgREST with the
caller's own Bearer token so RLS scopes rows to their own account, and
mirrors the AI Engine's /api/projects response shape exactly.
"""
import os

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

load_dotenv()

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


def _verify_user(token: str):
    """Return the Supabase user for this token, or None."""
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        return client.auth.get_user(token).user
    except Exception:
        return None


@router.get("/api/projects")
async def list_projects(limit: int = 50,
                        authorization: str | None = Header(None)):
    """List the signed-in user's projects from Supabase metadata."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return {"status": "success", "projects": []}
    token = (authorization.split(" ", 1)[1].strip()
             if authorization and authorization.lower().startswith("bearer ")
             else None)
    user = _verify_user(token) if token else None
    if user is None:
        return JSONResponse(status_code=401,
                            content={"message": "Sign in to list your projects."})

    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/projects",
            params={"select": "id,title,prompt,created_at",
                    "user_id": f"eq.{user.id}",
                    "order": "created_at.desc",
                    "limit": str(max(1, min(limit, 200)))},
            headers={"apikey": SUPABASE_ANON_KEY,
                     "Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        print(f"[projects] Supabase listing error: {exc}")
        return {"status": "success", "projects": []}

    rows = [r for r in resp.json() if isinstance(r, dict)]
    projects = []
    for row in rows:
        raw = row.get("id") or ""
        slug = raw.split("-", 1)[1] if "-" in raw else raw
        title = (row.get("title") or "").strip()
        projects.append({
            "id": raw,
            "name": title or slug.replace("-", " ").title() or raw,
            "slug": slug,
            "created_at": row.get("created_at") or "",
            "prompt": (row.get("prompt") or "")[:160],
        })
    return {"status": "success", "projects": projects}


projects_meta_router = router