import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
from models.road_segment import RoadSegment
from services.auth import get_current_admin
from services.prediction import predict_all_segments

router = APIRouter(prefix="/api/roads", tags=["roads"])

class DrainageUpdate(BaseModel):
    drainage_score: float

@router.get("")
@router.get("/")
async def get_roads(db: Session = Depends(get_db)):
    results = await predict_all_segments(db)

    high   = sum(1 for r in results if r["flood_risk"] == "high")
    medium = sum(1 for r in results if r["flood_risk"] == "medium")
    low    = sum(1 for r in results if r["flood_risk"] == "low")
    rainfall = results[0]["rainfall_mm"] if results else 0

    return {
        "roads": results,
        "summary": {
            "total":       len(results),
            "high":        high,
            "medium":      medium,
            "low":         low,
            "rainfall_mm": rainfall
        }
    }

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

