import requests
import time
import json

# Simple in-memory caches
rainfall_cache = {} # key: "lat,lng", value: {"time": timestamp, "val": rainfall_mm}
elevation_cache = {} # key: "lat,lng", value: elevation_m

CACHE_DURATION = 15 * 60 # 15 minutes

def get_rainfall(lat: float, lng: float) -> float:
    # Round to 2 decimal places to cluster requests (approx 1.1km grid)
    rlat = round(lat, 2)
    rlng = round(lng, 2)
    key = f"{rlat},{rlng}"
    return 18.0 # Mock rainfall for demo

def get_elevation(lat: float, lng: float) -> float:
    return 10.0 # Safe fallback
