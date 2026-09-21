import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# Load the variables from the .env file
load_dotenv() 

# Fetch the URL securely
DATABASE_URL = os.getenv("SUPABASE_DB_URL")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """Dependency injection to get the database session."""
    async with AsyncSessionLocal() as session:
        yield session