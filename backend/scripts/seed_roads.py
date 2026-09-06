import sys, os, json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import unary_union
from database import SessionLocal
from models.road_segment import RoadSegment

DATA_DIR   = os.path.join(os.path.dirname(__file__), "../data")
ROADS_FILE = os.path.join(DATA_DIR, "cleaned_roads.geojson")
FLOOD_FILE = os.path.join(DATA_DIR, "historical_flood_points.geojson")
WATER_FILE = os.path.join(DATA_DIR, "cleaned_water_bodies.geojson")
DRAIN_FILE = os.path.join(DATA_DIR, "cleaned_drainage.geojson")

def compute_centroid(coords):
    lats = [c[1] for c in coords]
    lngs = [c[0] for c in coords]
    return sum(lats)/len(lats), sum(lngs)/len(lngs)

def compute_road_length(coords):
    length = 0
    for i in range(len(coords) - 1):
        dx = coords[i+1][0] - coords[i][0]
        dy = coords[i+1][1] - coords[i][1]
        length += (dx**2 + dy**2) ** 0.5
    return round(length * 111000, 2)

def load_spatial_unions():
    print("  Loading water and drainage spatial unions...")
    water_gdf = gpd.read_file(WATER_FILE)
    drain_gdf = gpd.read_file(DRAIN_FILE)
    water_union = unary_union(water_gdf.geometry.values)
    drain_union = unary_union(drain_gdf.geometry.values)
    return water_union, drain_union

def load_flood_prone_osm_ids():
    with open(FLOOD_FILE) as f:
        data = json.load(f)
    
    flood_counts = {}
    for feat in data["features"]:
        props = feat["properties"]
        if props.get("is_flooded") == 1.0:
            osm_id = props.get("osm_id")
            if osm_id:
                flood_counts[str(osm_id)] = flood_counts.get(str(osm_id), 0) + 1
    
    print(f"  Flood-prone OSM IDs found: {len(flood_counts)}")
    return flood_counts

def highway_to_risk(highway, is_flood_prone, flood_count):
    if is_flood_prone and flood_count >= 5:
        return "high"
    elif is_flood_prone and flood_count >= 2:
        return "medium"
    high_risk_types = ["residential", "living_street", "service", "footway", "pedestrian"]
    medium_risk_types = ["tertiary", "primary_link", "construction"]
    if highway in high_risk_types:
        return "medium"
    elif highway in medium_risk_types:
        return "medium"
    return "low"

def seed():
    db = SessionLocal()
    with open(ROADS_FILE) as f:
        data = json.load(f)

    water_union, drain_union = load_spatial_unions()
    flood_counts = load_flood_prone_osm_ids()

    inserted = 0
    updated  = 0
    skipped  = 0

    for feat in data["features"]:
        props    = feat["properties"]
        geom     = feat["geometry"]
        osm_id   = str(props.get("id", ""))

        if not osm_id or geom["type"] != "LineString":
            skipped += 1
            continue

        coords = geom["coordinates"]
        centroid_lat, centroid_lng = compute_centroid(coords)
        road_len = compute_road_length(coords)

        pt = Point(centroid_lng, centroid_lat)
        dist_water = round(pt.distance(water_union) * 111000, 2)
        dist_drain = round(pt.distance(drain_union) * 111000, 2)

        numeric_id = osm_id.replace("way/", "").replace("relation/", "").replace("node/", "")
        is_flood_prone = numeric_id in flood_counts
        flood_count    = flood_counts.get(numeric_id, 0)

        highway   = props.get("highway") or "unclassified"
        flood_risk = highway_to_risk(highway, is_flood_prone, flood_count)

        existing = db.query(RoadSegment).filter_by(osm_id=osm_id).first()

        if existing:
            existing.name           = props.get("name")
            existing.highway        = highway
            existing.surface        = props.get("surface")
            existing.lanes          = str(props.get("lanes")) if props.get("lanes") else None
            existing.oneway         = props.get("oneway")
            existing.bridge         = props.get("bridge")
            existing.geometry       = json.dumps(geom)
            existing.centroid_lat   = centroid_lat
            existing.centroid_lng   = centroid_lng
            existing.flood_risk     = flood_risk
            existing.is_flood_prone  = is_flood_prone
            existing.flood_count    = flood_count
            existing.road_length    = road_len
            existing.dist_to_water_m = dist_water
            existing.dist_to_drain_m = dist_drain
            updated += 1
        else:
            seg = RoadSegment(
                osm_id          = osm_id,
                name            = props.get("name"),
                highway         = highway,
                surface         = props.get("surface"),
                lanes           = str(props.get("lanes")) if props.get("lanes") else None,
                oneway          = props.get("oneway"),
                bridge          = props.get("bridge"),
                geometry        = json.dumps(geom),
                centroid_lat    = centroid_lat,
                centroid_lng    = centroid_lng,
                flood_risk      = flood_risk,
                is_flood_prone   = is_flood_prone,
                flood_count     = flood_count,
                road_length     = road_len,
                dist_to_water_m  = dist_water,
                dist_to_drain_m  = dist_drain,
            )
            db.add(seg)
            inserted += 1

    db.commit()
    db.close()

    print(f"Seeding complete.")
    print(f"  Inserted : {inserted}")
    print(f"  Updated  : {updated}")
    print(f"  Skipped  : {skipped}")
    print(f"  Total roads in DB: {inserted + updated}")

if __name__ == "__main__":
    seed()
