from fastapi import APIRouter
from pydantic import BaseModel
from services.planner import generate_plan

router = APIRouter()

class PromptRequest(BaseModel):
    prompt: str

@router.post("/generate-plan")
def create_plan(req: PromptRequest):
    return generate_plan(req.prompt)