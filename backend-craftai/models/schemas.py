from pydantic import BaseModel

# What the frontend sends to you
class GenerateRequest(BaseModel):
    prompt: str
    project_name: str
    framework: str = "react"  # Optional default value

# What you send back to the frontend
class GenerateResponse(BaseModel):
    status: str
    message: str
    file_path: str | None = None