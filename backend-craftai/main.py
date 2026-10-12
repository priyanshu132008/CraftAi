import os
import sys

# Get the absolute path of the folder containing this main.py file
current_dir = os.path.dirname(os.path.abspath(__file__))

# Append it directly to the system path
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import plan, project
from services.planner import generate_plan

app = FastAPI()

# 1. Setup CORS: comma-separated CORS_ORIGINS in prod (e.g. the Vercel
# domain), wildcard default. Bearer-token auth only, so a wildcard is safe.
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["*"],
    allow_credentials=bool(_cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "CRAFTAI Backend Running"}

# Include standard routes
app.include_router(plan.router)
app.include_router(project.router)

# Supabase-backed project listing (matches the AI Engine's /api/projects shape)
from routes.projects_meta import projects_meta_router  # noqa: E402
app.include_router(projects_meta_router)

# Include AI generator endpoint
@app.post("/api/generate")
async def handle_prompt(payload: dict):
    user_prompt = payload.get("prompt")
    
    # Run your working Groq/Ollama engine
    plan = generate_plan(user_prompt) 
    
    # Route to the matching frontend preview mock
    blueprint_type = plan.get("type", "dashboard").lower()
    
    return {
        "status": "success",
        "plan": plan,
        "preview_url": f"http://localhost:3000/blueprints/{blueprint_type}"
    }


if __name__ == "__main__":
    import uvicorn

    # Render assigns the port via $PORT; bind 0.0.0.0 for containers.
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=port == 8001)
