import httpx
import asyncio
from datetime import datetime, timezone
from config import settings

# In-memory cache: {cache_key: {"value": float, "cached_at": datetime}}
_rainfall_cache = {}
CACHE_MINUTES = 15

def _is_cache_valid(cached_at: datetime) -> bool:
    now = datetime.now(timezone.utc)
    diff = (now - cached_at).total_seconds() / 60
    return diff < CACHE_MINUTES

async def get_rainfall(lat: float, lng: float) -> dict:
    cache_key = f"{round(lat, 3)},{round(lng, 3)}"
    
    if cache_key in _rainfall_cache:
        entry = _rainfall_cache[cache_key]
        if _is_cache_valid(entry["cached_at"]):
            return entry["value"]

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                settings.OPEN_METEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "hourly": "precipitation,precipitation_probability,weathercode",
                    "current_weather": True,
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata"
                }
            )
            response.raise_for_status()
            data = response.json()

            hourly = data["hourly"]
            current_weather = data.get("current_weather", {})

            # Get current hour index
            now_hour = datetime.now().hour
            precipitation = hourly["precipitation"][now_hour]
            precip_prob = hourly["precipitation_probability"][now_hour]
            weathercode = hourly["weathercode"][now_hour]

            # Determine risk from rainfall intensity
            if precipitation >= 30:
                risk_level = "high"
            elif precipitation >= 10:
                risk_level = "medium"
            else:
                risk_level = "low"

            result = {
                "rainfall_mm": round(precipitation, 1),
                "precipitation_probability": precip_prob,
                "weathercode": weathercode,
                "wind_speed": current_weather.get("windspeed", 0),
                "risk_level": risk_level,
                "cached_at": datetime.now(timezone.utc).isoformat()
            }

            _rainfall_cache[cache_key] = {
                "value": result,
                "cached_at": datetime.now(timezone.utc)
            }

            return result

    except Exception as e:
        print(f"Weather fetch failed for {lat},{lng}: {e}")
        return {
            "rainfall_mm": 0.0,
            "precipitation_probability": 0,
            "weathercode": 0,
            "wind_speed": 0,
            "risk_level": "low",
            "cached_at": None,
            "error": str(e)
        }

async def get_area_summary(lat: float, lng: float) -> dict:
    weather = await get_rainfall(lat, lng)
    rainfall = weather["rainfall_mm"]

    # Compute drainage load estimate from rainfall
    if rainfall >= 30:
        drainage_capacity = "Critical — overflow likely"
        drainage_pct = 95
    elif rainfall >= 20:
        drainage_capacity = "Elevated — drains at capacity"
        drainage_pct = 85
    elif rainfall >= 10:
        drainage_capacity = "Moderate — drains filling"
        drainage_pct = 60
    else:
        drainage_capacity = "Normal — drains clear"
        drainage_pct = 20

    return {
        "rainfall_mm": rainfall,
        "risk_level": weather["risk_level"],
        "drainage_status": drainage_capacity,
        "drainage_pct": drainage_pct,
        "precipitation_probability": weather["precipitation_probability"],
        "wind_speed": weather["wind_speed"]
    }
