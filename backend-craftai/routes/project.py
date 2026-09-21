import os
from sqlalchemy.future import select
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from services.blueprint import registry
from services.generator import generate_content
from services.builder import build_project
from services.database import get_db
from services.auth import get_current_user # NEW IMPORT
from models.project import Project

router = APIRouter()

class ProjectRequest(BaseModel):
    plan: dict

# Add user = Depends(get_current_user) to the parameters
@router.post("/generate-project")
async def create_project(
    req: ProjectRequest, 
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user) # Locks the endpoint
):
    blueprint_type = req.plan.get("type", "portfolio")
    
    try:
        blueprint = {
            "index.html": registry.get_template_file(blueprint_type, "index.html"),
            "style.css": registry.get_template_file(blueprint_type, "style.css"),
            "script.js": registry.get_template_file(blueprint_type, "script.js")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    content = generate_content(req.plan)
    path, files = build_project(blueprint, content)

    new_project = Project(
        user_id=user.id, # Save the user's ID from the verified token
        plan=req.plan,
        generated_files=list(files.keys()),
        local_path=path
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project) 

    return {
        "status": "success",
        "project_id": new_project.id,
        "projectPath": path,
        "files": files
    }

@router.get("/projects/{project_id}")
async def get_project(
    project_id: str, 
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user) # Locks the endpoint
):
    # Notice we now filter by BOTH project.id AND user.id 
    # so a user cannot fetch someone else's project
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": project.id,
        "plan": project.plan,
        "generated_files": project.generated_files,
        "local_path": project.local_path,
        "created_at": project.created_at
    }

@router.get("/projects/{project_id}/files")
async def get_project_files(
    project_id: str, 
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user) # Locks the endpoint
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files_content = {}
    for filename in project.generated_files:
        file_path = os.path.join(project.local_path, filename)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                files_content[filename] = f.read()
        else:
            files_content[filename] = "" 

    return {
        "project_id": project.id,
        "files": files_content
    }