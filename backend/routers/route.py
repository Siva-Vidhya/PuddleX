from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services.routing import compute_safe_route
from services.geocoding import geocode, reverse_geocode

router = APIRouter(prefix="/api", tags=["routing"])

class RouteRequest(BaseModel):
    start_lat:   float | None = None
    start_lng:   float | None = None
    end_lat:     float | None = None
    end_lng:     float | None = None
    start_place: str | None = None   # e.g. "T Nagar"
    end_place:   str | None = None   # e.g. "Adyar"

class GeocodeRequest(BaseModel):
    place: str

@router.post("/route")
async def get_safe_route(
    request: RouteRequest,
    db: Session = Depends(get_db)
):
    start_lat = request.start_lat
    start_lng = request.start_lng
    end_lat   = request.end_lat
    end_lng   = request.end_lng

    # Geocode place names if coordinates not provided
    if request.start_place and (start_lat is None or start_lng is None):
        geocoded = await geocode(request.start_place)
        if "error" in geocoded:
            raise HTTPException(status_code=400, detail=f"Could not find: {request.start_place}")
        start_lat = geocoded["lat"]
        start_lng = geocoded["lng"]

    if request.end_place and (end_lat is None or end_lng is None):
        geocoded = await geocode(request.end_place)
        if "error" in geocoded:
            raise HTTPException(status_code=400, detail=f"Could not find: {request.end_place}")
        end_lat = geocoded["lat"]
        end_lng = geocoded["lng"]

    if None in [start_lat, start_lng, end_lat, end_lng]:
        raise HTTPException(status_code=400, detail="Provide coordinates or place names for start and end")

    result = await compute_safe_route(start_lat, start_lng, end_lat, end_lng, db)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result

@router.post("/geocode")
async def geocode_place(request: GeocodeRequest):
    result = await geocode(request.place)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/geocode")
async def geocode_get(q: str):
    result = await geocode(q)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
