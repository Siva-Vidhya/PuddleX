import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) # Optional for Google users
    role = Column(String, default="citizen") # 'citizen' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)
