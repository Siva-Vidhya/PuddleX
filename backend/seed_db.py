import json
from database import SessionLocal, engine, Base
from models.road_segment import RoadSegment

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    if db.query(RoadSegment).count() > 0:
        print("Database already seeded with road segments.")
        return
        
    MOCK_ROAD_SEGMENTS = [
      {
        "id": "seg-1",
        "name": "Anna Salai Main",
        "coordinates": [[13.0827, 80.2707], [13.0750, 80.2650], [13.0700, 80.2600]],
        "rainfall_mm": 2.0, "elevation_m": 12.0, "drainage_score": 80.0, "past_flood_count": 0, "citizen_reports_count": 0, "road_type": 1,
      },
      {
        "id": "seg-2",
        "name": "Poonamallee High Road",
        "coordinates": [[13.0827, 80.2707], [13.0850, 80.2600], [13.0900, 80.2500]],
        "rainfall_mm": 15.0, "elevation_m": 8.0, "drainage_score": 60.0, "past_flood_count": 1, "citizen_reports_count": 0, "road_type": 1,
      },
      {
        "id": "seg-3",
        "name": "T Nagar Bypass",
        "coordinates": [[13.0700, 80.2600], [13.0600, 80.2500], [13.0550, 80.2450]],
        "rainfall_mm": 45.0, "elevation_m": 4.0, "drainage_score": 30.0, "past_flood_count": 5, "citizen_reports_count": 3, "road_type": 0,
      },
      {
        "id": "seg-4",
        "name": "Arcot Road",
        "coordinates": [[13.0550, 80.2450], [13.0650, 80.2350], [13.0750, 80.2250]],
        "rainfall_mm": 0.0, "elevation_m": 15.0, "drainage_score": 90.0, "past_flood_count": 0, "citizen_reports_count": 0, "road_type": 1,
      },
      {
        "id": "seg-5",
        "name": "Inner Ring Road",
        "coordinates": [[13.0900, 80.2500], [13.0800, 80.2350], [13.0750, 80.2250]],
        "rainfall_mm": 5.0, "elevation_m": 10.0, "drainage_score": 75.0, "past_flood_count": 0, "citizen_reports_count": 0, "road_type": 2,
      }
    ]
    
    for seg in MOCK_ROAD_SEGMENTS:
        db_seg = RoadSegment(
            id=seg["id"],
            name=seg["name"],
            coordinates_json=json.dumps(seg["coordinates"]),
            rainfall_mm=seg["rainfall_mm"],
            elevation_m=seg["elevation_m"],
            drainage_score=seg["drainage_score"],
            past_flood_count=seg["past_flood_count"],
            citizen_reports_count=seg["citizen_reports_count"],
            road_type=seg["road_type"],
            risk_level="low",
            risk_probability=0.0
        )
        db.add(db_seg)
        
    db.commit()
    print("Database seeded successfully.")
    
if __name__ == "__main__":
    seed()
