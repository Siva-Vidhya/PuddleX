import os, json, time
import numpy as np
import joblib
from services.weather import get_rainfall
import time
_prediction_cache = {}
_all_segments_cache = []

ML_DIR      = os.path.join(os.path.dirname(__file__), "../ml")
MODEL_PATH  = os.path.join(ML_DIR, "puddlex_model.joblib")
SCALER_PATH = os.path.join(ML_DIR, "puddlex_scaler.joblib")
FEAT_PATH   = os.path.join(ML_DIR, "feature_columns.json")

HIGHWAY_RISK_SCORE = {
    "motorway": 1, "trunk": 1, "primary": 2, "primary_link": 2,
    "secondary": 3, "tertiary": 3, "residential": 4,
    "living_street": 5, "service": 5, "footway": 5,
    "pedestrian": 5, "construction": 4, "unclassified": 3,
    "traffic_signals": 3, "road": 3
}

RISK_LABELS = {0: "low", 1: "medium", 2: "high"}

_model  = None
_scaler = None
_features = None

_prediction_cache = {}          # {osm_id: {risk_level, risk_probability, cached_at}}
PREDICTION_CACHE_SECONDS = 900  # 15 minutes

_all_segments_cache = []
_segments_cached_at = 0

def get_cached_prediction(osm_id: str):
    entry = _prediction_cache.get(osm_id)
    if entry and (time.time() - entry["cached_at"]) < PREDICTION_CACHE_SECONDS:
        return entry
    return None

def set_cached_prediction(osm_id: str, result: dict):
    _prediction_cache[osm_id] = {**result, "cached_at": time.time()}

def load_model():
    global _model, _scaler, _features
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            print("WARNING: Model not found. Run ml/train_model.py first.")
            return False
        _model    = joblib.load(MODEL_PATH)
        _scaler   = joblib.load(SCALER_PATH)
        with open(FEAT_PATH) as f:
            _features = json.load(f)
        print(f"ML model loaded: {MODEL_PATH}")
    return True

def predict_risk(
    osm_id: str = None,
    highway: str = "unclassified",
    oneway: int = 0,
    bridge: int = 0,
    road_length: float = 100.0,
    dist_to_water_m: float = 500.0,
    dist_to_drain_m: float = 500.0,
    flood_count: int = 0,
    rainfall_mm: float = 0.0
) -> dict:
    if osm_id:
        cached = get_cached_prediction(osm_id)
        if cached:
            return cached

    if not load_model():
        # Fallback to rule-based if model not trained yet
        if rainfall_mm > 30 or flood_count > 3:
            res = {"risk_level": "high",   "risk_probability": 0.85}
        elif rainfall_mm > 10 or flood_count > 0:
            res = {"risk_level": "medium", "risk_probability": 0.55}
        else:
            res = {"risk_level": "low", "risk_probability": 0.15}
        if osm_id:
            set_cached_prediction(osm_id, res)
        return res

    highway_score = HIGHWAY_RISK_SCORE.get(highway, 3)

    import pandas as pd
    cols = _features if _features else [
        "highway_score", "oneway", "bridge", "road_length",
        "dist_to_water_m", "dist_to_drain_m", "flood_count", "avg_rainfall_mm"
    ]
    feature_df = pd.DataFrame([[
        highway_score,
        oneway,
        bridge,
        road_length,
        dist_to_water_m,
        dist_to_drain_m,
        flood_count,
        rainfall_mm,
    ]], columns=cols)

    scaled = _scaler.transform(feature_df)
    proba  = _model.predict_proba(scaled)[0]
    pred   = int(_model.predict(scaled)[0])

    # Boost risk if heavy live rainfall
    if rainfall_mm >= 30 and pred == 0:
        pred = 1
    if rainfall_mm >= 50:
        pred = 2

    result = {
        "risk_level":       RISK_LABELS[pred],
        "risk_probability": round(float(max(proba)), 3),
        "probabilities": {
            "low":    round(float(proba[0]) if len(proba) > 0 else 0, 3),
            "medium": round(float(proba[1]) if len(proba) > 1 else 0, 3),
            "high":   round(float(proba[2]) if len(proba) > 2 else 0, 3),
        }
    }

    if osm_id:
        set_cached_prediction(osm_id, result)

    return result

async def precompute_all_segments(db):
    global _all_segments_cache, _segments_cached_at
    from models.road_segment import RoadSegment
    from services.weather import get_rainfall

    weather = await get_rainfall(lat=13.0827, lng=80.2707)
    live_rainfall = weather["rainfall_mm"]

    segments = db.query(RoadSegment).all()
    results = []
    for seg in segments:
        result = predict_risk(
            osm_id          = seg.osm_id,
            highway         = seg.highway or "unclassified",
            oneway          = 1 if seg.oneway == "yes" else 0,
            bridge          = 1 if seg.bridge else 0,
            road_length     = getattr(seg, "road_length", 100.0) or 100.0,
            dist_to_water_m = getattr(seg, "dist_to_water_m", 500.0) or 500.0,
            dist_to_drain_m = getattr(seg, "dist_to_drain_m", 500.0) or 500.0,
            flood_count     = seg.flood_count or 0,
            rainfall_mm     = live_rainfall,
        )
        results.append({
            "id":               seg.id,
            "osm_id":           seg.osm_id,
            "name":             seg.name,
            "highway":          seg.highway,
            "geometry":         seg.geometry,
            "centroid_lat":     seg.centroid_lat,
            "centroid_lng":     seg.centroid_lng,
            "flood_risk":       result["risk_level"],
            "risk_probability": result["risk_probability"],
            "rainfall_mm":      live_rainfall,
            "flood_count":      seg.flood_count or 0,
            "is_flood_prone":   seg.is_flood_prone,
        })
        # Update DB risk level
        seg.flood_risk  = result["risk_level"]
        seg.rainfall_mm = live_rainfall

    db.commit()
    _all_segments_cache = results
    _segments_cached_at = time.time()
    print(f"Precomputed risk for {len(results)} segments")
    return results

def get_precomputed_segments():
    return _all_segments_cache

async def predict_all_segments(db) -> list:
    if _all_segments_cache and (time.time() - _segments_cached_at) < PREDICTION_CACHE_SECONDS:
        return _all_segments_cache
    return await precompute_all_segments(db)

def get_precomputed_segments():
    return _all_segments_cache

async def precompute_all_segments(db):
    global _all_segments_cache
    from models.road_segment import RoadSegment
    from services.weather import get_rainfall
    weather = await get_rainfall(lat=13.0827, lng=80.2707)
    live_rainfall = weather["rainfall_mm"]
    segments = db.query(RoadSegment).all()
    results = []
    for seg in segments:
        result = predict_risk(
            osm_id=seg.osm_id,
            highway=seg.highway or "unclassified",
            oneway=1 if seg.oneway == "yes" else 0,
            bridge=1 if seg.bridge else 0,
            road_length=getattr(seg,"road_length",100.0) or 100.0,
            dist_to_water_m=getattr(seg,"dist_to_water_m",500.0) or 500.0,
            dist_to_drain_m=getattr(seg,"dist_to_drain_m",500.0) or 500.0,
            flood_count=seg.flood_count or 0,
            rainfall_mm=live_rainfall,
        )
        results.append({
            "osm_id": seg.osm_id,
            "name": seg.name,
            "highway": seg.highway,
            "geometry": seg.geometry,
            "centroid_lat": seg.centroid_lat,
            "centroid_lng": seg.centroid_lng,
            "flood_risk": result["risk_level"],
            "risk_probability": result["risk_probability"],
            "rainfall_mm": live_rainfall,
            "flood_count": seg.flood_count or 0,
            "is_flood_prone": seg.is_flood_prone,
        })
        seg.flood_risk = result["risk_level"]
        seg.rainfall_mm = live_rainfall
    db.commit()
    _all_segments_cache = results
    print(f"Precomputed {len(results)} road segments")
    return results
