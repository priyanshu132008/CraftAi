from fastapi import FastAPI
from routes import plan, project

app = FastAPI()

@app.get("/")
def home():
    return {"message": "CRAFTAI Backend Running"}

app.include_router(plan.router)
app.include_router(project.router)