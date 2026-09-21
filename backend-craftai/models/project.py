from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from services.database import Base
from datetime import datetime
import uuid

class Project(Base):
    __tablename__ = "projects"

    # Use a string UUID for the primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    
    # NEW: Link the project to the Supabase User ID
    user_id = Column(String, nullable=False, index=True) 
    

    # JSONB is crucial here. It allows us to query the nested plan data natively in Postgres
    plan = Column(JSONB, nullable=False)
    
    # We can use a Postgres ARRAY of strings, or another JSONB column
    generated_files = Column(ARRAY(String), default=[])
    
    local_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)