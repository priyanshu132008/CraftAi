from fastapi import APIRouter
from pydantic import BaseModel
from services.blueprint import get_portfolio_blueprint
from services.generator import generate_content
from services.builder import build_project

router = APIRouter()

class ProjectRequest(BaseModel):
    plan: dict

@router.post("/generate-project")
def create_project(req: ProjectRequest):
    blueprint = get_portfolio_blueprint()
    content = generate_content(req.plan)

    path, files = build_project(blueprint, content)

    return {
        "projectPath": path,
        "files": files
    }