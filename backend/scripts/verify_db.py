import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from models.road_segment import RoadSegment
from models.rainfall_summary import RainfallSummary

db = SessionLocal()

total       = db.query(RoadSegment).count()
flood_prone = db.query(RoadSegment).filter_by(is_flood_prone=True).count()
high_risk   = db.query(RoadSegment).filter_by(flood_risk="high").count()
medium_risk = db.query(RoadSegment).filter_by(flood_risk="medium").count()
low_risk    = db.query(RoadSegment).filter_by(flood_risk="low").count()
named       = db.query(RoadSegment).filter(RoadSegment.name != None).count()
rain_months = db.query(RainfallSummary).count()

print(f"Road Segments     : {total}")
print(f"Named Roads       : {named}")
print(f"Flood Prone       : {flood_prone}")
print(f"High Risk         : {high_risk}")
print(f"Medium Risk       : {medium_risk}")
print(f"Low Risk          : {low_risk}")
print(f"Rainfall Months   : {rain_months}")

# Print 5 sample roads
print("\nSample roads:")
for seg in db.query(RoadSegment).limit(5).all():
    print(f"  [{seg.flood_risk.upper()}] {seg.name or 'Unnamed'} ({seg.highway}) flood_prone={seg.is_flood_prone} count={seg.flood_count}")

db.close()
