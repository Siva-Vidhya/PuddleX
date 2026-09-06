import httpx
import json
from config import settings

async def get_shortest_route(
    start_lat: float, start_lng: float,
    end_lat: float,   end_lng: float
) -> dict:
    try:
        # OSRM expects coordinates as lng,lat (note: longitude first)
        coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"
        url = f"{settings.OSRM_BASE_URL}/route/v1/driving/{coords}"

        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, params={
                "overview":    "full",
                "geometries":  "geojson",
                "steps":       "true",
                "annotations": "false"
            })
            r.raise_for_status()
            data = r.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            return {"error": "OSRM returned no route"}

        route     = data["routes"][0]
        geometry  = route["geometry"]          # GeoJSON LineString
        distance  = route["distance"]          # metres
        duration  = route["duration"]          # seconds

        # Extract step-by-step road names from legs
        road_names = []
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                name = step.get("name", "")
                if name and name not in road_names:
                    road_names.append(name)

        return {
            "geometry":        geometry,
            "distance_m":      round(distance),
            "distance_km":     round(distance / 1000, 2),
            "duration_sec":    round(duration),
            "duration_min":    round(duration / 60, 1),
            "road_names":      road_names,
            "coordinates":     geometry["coordinates"]
        }

    except Exception as e:
        return {"error": str(e)}

async def get_nearest_road(lat: float, lng: float) -> dict:
    # Snap a point to the nearest road on the OSRM graph
    try:
        url = f"{settings.OSRM_BASE_URL}/nearest/v1/driving/{lng},{lat}"
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params={"number": 1})
            r.raise_for_status()
            data = r.json()
        if data.get("code") == "Ok":
            wp = data["waypoints"][0]
            return {
                "lat":      wp["location"][1],
                "lng":      wp["location"][0],
                "name":     wp.get("name", ""),
                "distance": wp.get("distance", 0)
            }
        return {"lat": lat, "lng": lng, "name": ""}
    except Exception as e:
        return {"lat": lat, "lng": lng, "name": "", "error": str(e)}
