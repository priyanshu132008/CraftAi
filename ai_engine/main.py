"""CraftAI FastAPI entrypoint.

Run from the project root with either:
    uvicorn main:app --reload          # root wrapper -> this app
    uvicorn ai_engine.main:app --reload
"""
import os
import sys
from pathlib import Path

# Project root (parent of this ai_engine folder). Put it on sys.path so the
# `ai_engine.*` absolute imports below resolve no matter where uvicorn is
# launched from. Also pin CWD to root so plan_generator's relative
# `ai_engine/prompts/system_prompt.txt` path resolves.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_engine.services.plan_generator import generate_plan

app = FastAPI(title="CraftAI Engine")

# Allow the Next.js frontend on port 3000 to call this backend from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The only blueprint routes that actually exist on the frontend. The system
# prompt constrains the LLM to these, but we normalize defensively so a
# misclassified or legacy value (e.g. "business", "website") still resolves to
# a real preview route instead of 404ing inside the workspace iframe.
ALLOWED_BLUEPRINTS = {"dashboard", "landing-page", "portfolio"}
_LEGACY_TYPE_MAP = {
    "business": "dashboard",
    "website": "landing-page",
    "saas": "landing-page",
    "app": "landing-page",
    "site": "landing-page",
    "analytics": "dashboard",
    "admin": "dashboard",
}


def _resolve_blueprint_type(plan: dict) -> str:
    raw = str(plan.get("type", "dashboard")).strip().lower()
    resolved = _LEGACY_TYPE_MAP.get(raw, raw)
    if resolved not in ALLOWED_BLUEPRINTS:
        resolved = "dashboard"
    return resolved


@app.post("/api/generate")
async def handle_prompt(payload: dict):
    user_prompt = payload.get("prompt")

    # Run the existing AI engine (Groq/Ollama) -- logic untouched.
    plan = generate_plan(user_prompt)

    # Route to the matching pre-built frontend preview mock. Normalize so the
    # iframe always lands on a real route even if the model drifts off-script.
    blueprint_type = _resolve_blueprint_type(plan)
    # Reflect the normalized type back into the plan the frontend renders.
    if isinstance(plan, dict):
        plan["type"] = blueprint_type

    return {
        "status": "success",
        "plan": plan,
        "preview_url": f"http://localhost:3000/blueprints/{blueprint_type}",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=8000, reload=True)