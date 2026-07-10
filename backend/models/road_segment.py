from sqlalchemy import Column, String, Float, Integer
from database import Base
import json

class RoadSegment(Base):
    __tablename__ = "road_segments"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    # Store coordinates as a JSON string: "[[lat, lng], [lat, lng]]"
    coordinates_json = Column(String, nullable=False)
    
    # ML Features
    rainfall_mm = Column(Float, default=0.0)
    elevation_m = Column(Float, default=10.0)
    drainage_score = Column(Float, default=50.0)
    past_flood_count = Column(Integer, default=0)
    citizen_reports_count = Column(Integer, default=0)
    road_type = Column(Integer, default=0)
    
    # Computed Outputs
    risk_level = Column(String, default="low") # 'low', 'medium', 'high'
    risk_probability = Column(Float, default=0.0)
    last_reported_flood = Column(String, nullable=True)
    
    @property
    def coordinates(self):
        return json.loads(self.coordinates_json)
