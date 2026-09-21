from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import plan, project

app = FastAPI()

@app.get("/")
def home():
    return {"message": "CRAFTAI Backend Running"}

# 1. Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your Next.js URL (e.g., "http://localhost:3000")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plan.router)
app.include_router(project.router)