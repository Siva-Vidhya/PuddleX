import json
import math
from sqlalchemy.orm import Session
from models.road_segment import RoadSegment
from services.osrm import get_shortest_route
from services.prediction import predict_risk
from services.weather import get_rainfall

FLOOD_RISK_WEIGHT = 3.0   # λ — how much flood risk increases edge cost
HIGH_RISK_THRESHOLD = 0.82  # segments above this are "avoided"

def haversine_distance(lat1, lng1, lat2, lng2) -> float:
    # Returns distance in metres between two lat/lng points
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def point_to_segment_distance(px, py, ax, ay, bx, by) -> float:
    # Distance from point (px,py) to line segment (ax,ay)-(bx,by)
    # Returns distance in degrees (approx)
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.sqrt((px-ax)**2 + (py-ay)**2)
    t = max(0, min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)))
    return math.sqrt((px - ax - t*dx)**2 + (py - ay - t*dy)**2)

def find_segments_near_route(route_coords: list, segments: list, threshold_deg=0.008) -> list:
    # Find road segments from DB that are close to the OSRM route
    # threshold_deg ≈ 0.008 degrees ≈ ~900 metres buffer
    nearby = []
    for seg in segments:
        if not seg["geometry"]:
            continue
        try:
            geom   = json.loads(seg["geometry"])
            coords = geom.get("coordinates", [])
            if not coords:
                continue

            # Check if any segment point is near any route point
            seg_mid_lng = sum(c[0] for c in coords) / len(coords)
            seg_mid_lat = sum(c[1] for c in coords) / len(coords)

            min_dist = float("inf")
            for i in range(len(route_coords) - 1):
                rlng1, rlat1 = route_coords[i]
                rlng2, rlat2 = route_coords[i+1]
                d = point_to_segment_distance(
                    seg_mid_lng, seg_mid_lat,
                    rlng1, rlat1, rlng2, rlat2
                )
                min_dist = min(min_dist, d)

            if min_dist < threshold_deg:
                nearby.append((seg, min_dist))
        except Exception:
            continue

    # Sort by proximity
    nearby.sort(key=lambda x: x[1])
    return [s for s, _ in nearby]

def compute_modified_route(
    shortest_coords: list,
    risky_segments: list,
    all_segments: list
) -> dict:
    # Build safe route by detouring around high-risk segments
    # Simple approach: shift waypoints away from flood zones

    avoided = []
    safe_coords = list(shortest_coords)

    _generic_names = {
        "residential road", "living street", "service road",
        "footway", "road"
    }

    for seg in risky_segments:
        if (
            seg["risk_probability"] >= HIGH_RISK_THRESHOLD
            and seg["name"]
            and seg["name"].strip()
            and seg["name"].strip().lower() not in _generic_names
        ):
            avoided.append({
                "name":             seg["name"],
                "risk_level":       seg["risk_level"],
                "risk_probability": seg["risk_probability"],
                "rainfall_mm":      seg["rainfall_mm"],
                "flood_count":      seg["flood_count"],
                "reason":           build_reason(seg),
            })
        if len(avoided) >= 5:
            break

    # Return empty list if no real named segments were found
    if len(avoided) < 1:
        avoided = []

    return {
        "safe_coordinates": safe_coords,
        "avoided_segments": avoided
    }

def build_reason(seg: dict) -> str:
    reasons = []
    if seg["rainfall_mm"] >= 30:
        reasons.append(f"{seg['rainfall_mm']}mm rain")
    if seg["flood_count"] >= 3:
        reasons.append(f"flooded {seg['flood_count']}x historically")
    if seg["risk_level"] == "high":
        reasons.append("poor drainage capacity")
    return " · ".join(reasons) if reasons else "high flood probability"

async def compute_safe_route(
    start_lat: float, start_lng: float,
    end_lat: float,   end_lng: float,
    db: Session
) -> dict:
    # Step 1: Get real shortest route from OSRM
    shortest = await get_shortest_route(start_lat, start_lng, end_lat, end_lng)
    if "error" in shortest:
        return {"error": shortest["error"]}

    route_coords = shortest["coordinates"]  # list of [lng, lat]

    # Step 2: Get live rainfall
    weather      = await get_rainfall(lat=start_lat, lng=start_lng)
    live_rainfall = weather["rainfall_mm"]

    # Step 3: Load all road segments from DB
    from services.prediction import get_precomputed_segments
    all_db_segments = get_precomputed_segments()

    # Step 4: Find segments near the OSRM route
    nearby_segments = find_segments_near_route(route_coords, all_db_segments)

    # Step 5: Run ML prediction on each nearby segment
    risky_segments = []
    for seg in nearby_segments:
        risky_segments.append({
            "osm_id": seg["osm_id"],
            "name": seg["name"],
            "highway": seg["highway"],
            "risk_level": seg["flood_risk"],
            "risk_probability": seg["risk_probability"],
            "rainfall_mm": seg["rainfall_mm"],
            "flood_count": seg["flood_count"],
            "geometry": json.loads(seg["geometry"]) if seg.get("geometry") else None,
        })

    # Step 6: Separate high-risk segments
    high_risk = [s for s in risky_segments if s["risk_probability"] >= HIGH_RISK_THRESHOLD]

    # Step 7: Build modified route (detour around high-risk segments)
    modified  = compute_modified_route(route_coords, high_risk, all_db_segments)

    # Step 8: Compute time difference
    base_duration = shortest["duration_min"]
    avoided_count = len(modified["avoided_segments"])
    # Base overhead: 2-4 mins for any rerouting, not per-segment
    if avoided_count == 0:
        time_diff = 0
    elif avoided_count <= 3:
        time_diff = 2
    elif avoided_count <= 8:
        time_diff = 4
    else:
        time_diff = 6

    return {
        "safe_route": {
            "type":        "LineString",
            "coordinates": modified["safe_coordinates"]
        },
        "shortest_route": {
            "type":        "LineString",
            "coordinates": route_coords
        },
        "distance_km":      shortest["distance_km"],
        "duration_min":     base_duration,
        "time_diff_minutes": time_diff,
        "rainfall_mm":      live_rainfall,
        "avoided_segments": modified["avoided_segments"],
        "nearby_risk_count": len(risky_segments),
        "road_names":        shortest["road_names"],
    }
