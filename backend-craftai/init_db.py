import asyncio
from services.database import engine, Base
# Import the model so Base knows about it
from models.project import Project 

async def init_models():
    async with engine.begin() as conn:
        # Creates the table in Supabase if it doesn't exist
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_models())