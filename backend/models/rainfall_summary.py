from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime
from database import Base

class RainfallSummary(Base):
    __tablename__ = "rainfall_summary"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    month           = Column(Integer)         # 1-12
    avg_rainfall_mm = Column(Float)           # avg hourly rainfall for that month
    max_rainfall_mm = Column(Float)           # max hourly rainfall ever in that month
    high_risk_hours = Column(Integer)         # hours where rain > 30mm in that month
    created_at      = Column(DateTime, default=datetime.utcnow)
