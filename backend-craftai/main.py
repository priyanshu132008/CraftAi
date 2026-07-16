from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.plan_generator import generate_plan # Your existing service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify your frontend port (e.g., http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate")
async def handle_prompt(payload: dict):
    user_prompt = payload.get("prompt")
    # 1. Run your working Groq Llama 3.3 engine
    plan = generate_plan(user_prompt) 
    
    # 2. Return the plan + tell frontend which pre-baked route to load
    blueprint_type = plan.get("type", "dashboard").lower()
    
    return {
        "status": "success",
        "plan": plan,
        "preview_url": f"http://localhost:3000/blueprints/{blueprint_type}"
    }