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
from services.plan_generator import generate_plan 

app = FastAPI()

# 1. Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your Next.js URL (e.g., "http://localhost:3000")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "CRAFTAI Backend Running"}

# Include standard routes
app.include_router(plan.router)
app.include_router(project.router)

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
