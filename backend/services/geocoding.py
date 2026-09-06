import httpx
from config import settings

HEADERS = {"User-Agent": "PuddleX/1.0 (flood navigation app)"}
# Nominatim requires a User-Agent header — always include it

async def geocode(place: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{settings.NOMINATIM_BASE_URL}/search",
                params={
                    "q": f"{place}, Chennai, Tamil Nadu, India",
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                },
                headers=HEADERS
            )
            r.raise_for_status()
            results = r.json()

            if not results:
                return {"error": f"Location not found: {place}"}

            top = results[0]
            return {
                "name":         top.get("display_name", place),
                "lat":          float(top["lat"]),
                "lng":          float(top["lon"]),
                "type":         top.get("type"),
                "importance":   top.get("importance"),
            }

    except Exception as e:
        return {"error": str(e)}

async def reverse_geocode(lat: float, lng: float) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{settings.NOMINATIM_BASE_URL}/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "json"
                },
                headers=HEADERS
            )
            r.raise_for_status()
            data = r.json()
            addr = data.get("address", {})
            name = (
                addr.get("road") or
                addr.get("suburb") or
                addr.get("neighbourhood") or
                data.get("display_name", f"{lat},{lng}")
            )
            return {"name": name, "lat": lat, "lng": lng}

    except Exception as e:
        return {"error": str(e), "name": f"{lat},{lng}", "lat": lat, "lng": lng}
