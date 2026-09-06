from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime
from database import Base

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    osm_id = Column(String, unique=True, index=True)   # from "id" field e.g. "way/4748353"
    name = Column(String, nullable=True)
    highway = Column(String, nullable=True)            # primary, residential, tertiary etc.
    surface = Column(String, nullable=True)
    lanes = Column(String, nullable=True)
    oneway = Column(String, nullable=True)
    bridge = Column(String, nullable=True)
    geometry = Column(Text, nullable=True)             # GeoJSON LineString as JSON string
    centroid_lat = Column(Float, nullable=True)        # computed centroid lat
    centroid_lng = Column(Float, nullable=True)        # computed centroid lng
    flood_risk = Column(String, default="low")         # low / medium / high
    is_flood_prone = Column(Boolean, default=False)    # from historical flood data
    flood_count = Column(Integer, default=0)           # how many flood points matched
    avg_water_depth_cm = Column(Float, default=0.0)
    rainfall_mm = Column(Float, default=0.0)           # last live rainfall value
    road_length = Column(Float, default=100.0)
    dist_to_water_m = Column(Float, default=500.0)
    dist_to_drain_m = Column(Float, default=500.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

