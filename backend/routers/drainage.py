from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import SessionLocal
from models.road_segment import RoadSegment
from services.auth import get_current_admin

router = APIRouter(prefix="/api/roads", tags=["roads"])

class DrainageUpdate(BaseModel):
    drainage_score: float

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
def get_all_roads(db: SessionLocal = Depends(get_db)):
    return db.query(RoadSegment).limit(100).all()

@router.put("/{road_id}/drainage")
def update_drainage(road_id: str, payload: DrainageUpdate, db: SessionLocal = Depends(get_db), current_admin = Depends(get_current_admin)):
    if payload.drainage_score < 1 or payload.drainage_score > 100:
        raise HTTPException(status_code=400, detail="Drainage score must be between 1 and 100")
        
    road = db.query(RoadSegment).filter(RoadSegment.id == road_id).first()
    if not road:
        raise HTTPException(status_code=404, detail="Road segment not found")
        
    road.drainage_score = payload.drainage_score
    db.commit()
    return {"status": "success", "road_id": road_id, "drainage_score": road.drainage_score}
