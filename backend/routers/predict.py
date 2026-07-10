import os
import joblib
import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.road_segment import RoadSegment

router = APIRouter(prefix="/api", tags=["ml"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "flood_model.joblib")
model = None
feature_names = ["rainfall_mm", "elevation_m", "drainage_score", "past_flood_count", "citizen_reports_count", "road_type"]

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")

class PredictRequest(BaseModel):
    rainfall_mm: float
    elevation_m: float
    drainage_score: float
    past_flood_count: int
    citizen_reports_count: int
    road_type: int

@router.post("/predict")
def predict_risk(req: PredictRequest):
    if not model:
        return {"error": "Model not loaded"}
        
    features = pd.DataFrame([{
        'rainfall_mm': req.rainfall_mm,
        'elevation_m': req.elevation_m,
        'drainage_score': req.drainage_score,
        'past_flood_count': req.past_flood_count,
        'citizen_reports_count': req.citizen_reports_count,
        'road_type': req.road_type
    }])
    
    prob = model.predict_proba(features)[0][1]
    
    if prob < 0.3:
        risk_level = "low"
    elif prob < 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"
        
    importances = model.feature_importances_
    top_features = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:3]
    explanation = f"Top contributing factors: {', '.join([f[0].replace('_', ' ') for f in top_features])}."
    
    return {
        "risk_level": risk_level,
        "risk_probability": round(prob, 3),
        "explanation": explanation
    }

@router.get("/roads/risk")
def get_all_roads_risk(db: Session = Depends(get_db)):
    roads = db.query(RoadSegment).all()
    if not model:
        # Fallback if model not loaded
        return [
            {
                "id": r.id,
                "name": r.name,
                "coordinates": r.coordinates,
                "risk": r.risk_level,
                "recentRainfall": f"{r.rainfall_mm}mm",
                "lastReportedFlood": r.last_reported_flood
            } for r in roads
        ]
        
    results = []
    for r in roads:
        features = pd.DataFrame([{
            'rainfall_mm': r.rainfall_mm,
            'elevation_m': r.elevation_m,
            'drainage_score': r.drainage_score,
            'past_flood_count': r.past_flood_count,
            'citizen_reports_count': r.citizen_reports_count,
            'road_type': r.road_type
        }])
        
        prob = model.predict_proba(features)[0][1]
        
        if prob < 0.3:
            r.risk_level = "low"
        elif prob < 0.7:
            r.risk_level = "medium"
        else:
            r.risk_level = "high"
            
        r.risk_probability = prob
        
        results.append({
            "id": r.id,
            "name": r.name,
            "coordinates": r.coordinates,
            "risk": r.risk_level,
            "recentRainfall": f"{r.rainfall_mm}mm",
            "lastReportedFlood": r.last_reported_flood
        })
        
    db.commit()
    return results
