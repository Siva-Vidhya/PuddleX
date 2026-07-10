import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime
from database import Base

class FloodReport(Base):
    __tablename__ = "flood_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    photo_url = Column(String, nullable=True)
    water_depth = Column(String, nullable=False) # 'ankle', 'knee', 'waist', 'vehicle'
    severity = Column(String, nullable=False) # 'low', 'medium', 'high'
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String, nullable=True) # Optional for now
    status = Column(String, default="pending") # 'pending', 'verified', 'dismissed'
