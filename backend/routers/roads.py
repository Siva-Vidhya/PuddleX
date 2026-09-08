import json
from fastapi import APIRouter, HTTPException, Depends, Query
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
@router.get("/api/roads")
async def get_roads(
  db: Session = Depends(get_db),
  simulate_rainfall: float = Query(default=None)
):
  from services.prediction import get_precomputed_segments, predict_risk
  import json
  from services import prediction

  segments = get_precomputed_segments()
  if not segments:
    segments = await predict_all_segments(db)

  # If simulate_rainfall is provided, override the rainfall value
  # and re-run prediction for all segments
  if simulate_rainfall is not None:
    prediction._prediction_cache.clear()
    results = []
    for seg in segments:
      result = predict_risk(
        osm_id          = seg["osm_id"],
        highway         = seg["highway"] or "unclassified",
        oneway          = 1 if seg.get("oneway") == "yes" else 0,
        bridge          = 1 if seg.get("bridge") else 0,
        road_length     = seg.get("road_length") or 100.0,
        dist_to_water_m = seg.get("dist_to_water_m") or 500.0,
        dist_to_drain_m = seg.get("dist_to_drain_m") or 500.0,
        flood_count     = seg.get("flood_count") or 0,
        rainfall_mm     = simulate_rainfall,
      )
      results.append({
        **seg,
        "flood_risk":       result["risk_level"],
        "risk_probability": result["risk_probability"],
        "rainfall_mm":      simulate_rainfall,
        "geometry":         json.loads(seg["geometry"]) if isinstance(seg.get("geometry"), str) else seg.get("geometry"),
      })

    high   = sum(1 for r in results if r["flood_risk"] == "high")
    medium = sum(1 for r in results if r["flood_risk"] == "medium")
    low    = sum(1 for r in results if r["flood_risk"] == "low")

    return {
      "roads": results,
      "summary": {
        "total": len(results),
        "high": high, "medium": medium, "low": low,
        "simulated_rainfall": simulate_rainfall
      }
    }

  # Default — return precomputed segments
  results = []
  for seg in segments:
    results.append({
      **seg,
      "geometry": json.loads(seg["geometry"]) if isinstance(seg.get("geometry"), str) else seg.get("geometry"),
    })

  high   = sum(1 for r in results if r["flood_risk"] == "high")
  medium = sum(1 for r in results if r["flood_risk"] == "medium")
  low    = sum(1 for r in results if r["flood_risk"] == "low")

  return {
    "roads": results,
    "summary": {"total": len(results), "high": high, "medium": medium, "low": low}
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

