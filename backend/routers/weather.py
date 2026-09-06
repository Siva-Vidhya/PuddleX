from fastapi import APIRouter, Query
from services.weather import get_rainfall, get_area_summary

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/current")
async def current_weather(
    lat: float = Query(default=13.0827, description="Latitude"),
    lng: float = Query(default=80.2707, description="Longitude")
):
    return await get_rainfall(lat, lng)

@router.get("/summary")
async def area_summary(
    lat: float = Query(default=13.0827, description="Latitude"),
    lng: float = Query(default=80.2707, description="Longitude")
):
    return await get_area_summary(lat, lng)

@router.get("/forecast")
async def forecast(
    lat: float = Query(default=13.0827),
    lng: float = Query(default=80.2707)
):
    import httpx
    from config import settings
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(
            settings.OPEN_METEO_BASE_URL,
            params={
                "latitude": lat,
                "longitude": lng,
                "hourly": "precipitation,precipitation_probability",
                "forecast_days": 1,
                "timezone": "Asia/Kolkata"
            }
        )
        data = r.json()
        hours = data["hourly"]["time"]
        precip = data["hourly"]["precipitation"]
        prob = data["hourly"]["precipitation_probability"]
        
        return {
            "forecast": [
                {
                    "time": hours[i],
                    "rainfall_mm": precip[i],
                    "probability": prob[i]
                }
                for i in range(24)
            ]
        }
