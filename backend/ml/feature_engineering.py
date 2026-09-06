import os, sys, json
import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import LineString, shape
from shapely.ops import nearest_points

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

HIGHWAY_RISK_SCORE = {
    "motorway": 1, "trunk": 1, "primary": 2, "primary_link": 2,
    "secondary": 3, "tertiary": 3, "residential": 4,
    "living_street": 5, "service": 5, "footway": 5,
    "pedestrian": 5, "construction": 4, "unclassified": 3,
    "traffic_signals": 3, "road": 3, None: 3
}

def load_roads():
    path = os.path.join(DATA_DIR, "cleaned_roads.geojson")
    with open(path) as f:
        data = json.load(f)

    rows = []
    for feat in data["features"]:
        props = feat["properties"]
        geom = feat["geometry"]
        if geom["type"] != "LineString":
            continue
        coords = geom["coordinates"]
        # Compute centroid
        lats = [c[1] for c in coords]
        lngs = [c[0] for c in coords]
        # Compute road length (simple euclidean approximation in degrees)
        length = 0
        for i in range(len(coords)-1):
            dx = coords[i+1][0] - coords[i][0]
            dy = coords[i+1][1] - coords[i][1]
            length += (dx**2 + dy**2) ** 0.5

        osm_id = str(props.get("id", "")).replace("way/","").replace("relation/","")
        rows.append({
            "osm_id": osm_id,
            "full_osm_id": str(props.get("id", "")),
            "name": props.get("name"),
            "highway": props.get("highway") or "unclassified",
            "surface": props.get("surface"),
            "oneway": 1 if props.get("oneway") == "yes" else 0,
            "bridge": 1 if props.get("bridge") else 0,
            "centroid_lat": sum(lats)/len(lats),
            "centroid_lng": sum(lngs)/len(lngs),
            "road_length": round(length * 111000, 2),  # approx metres
            "geometry": geom
        })
    return pd.DataFrame(rows)

def load_flood_labels():
    path = os.path.join(DATA_DIR, "historical_flood_points.geojson")
    with open(path) as f:
        data = json.load(f)

    flood_map = {}
    for feat in data["features"]:
        props = feat["properties"]
        osm_id = str(props.get("osm_id", ""))
        if not osm_id:
            continue
        is_flooded = 1 if props.get("is_flooded") == 1.0 else 0
        if osm_id in flood_map:
            flood_map[osm_id]["count"] += 1
            flood_map[osm_id]["is_flooded"] = max(flood_map[osm_id]["is_flooded"], is_flooded)
        else:
            flood_map[osm_id] = {"is_flooded": is_flooded, "count": 1}
    return flood_map

def compute_distance_to_water(roads_df):
    water_path = os.path.join(DATA_DIR, "cleaned_water_bodies.geojson")
    drain_path = os.path.join(DATA_DIR, "cleaned_drainage.geojson")

    water_gdf = gpd.read_file(water_path)
    drain_gdf = gpd.read_file(drain_path)

    # Merge all water geometries into one
    from shapely.ops import unary_union
    water_union = unary_union(water_gdf.geometry.values)
    drain_union = unary_union(drain_gdf.geometry.values)

    distances_water = []
    distances_drain = []

    for _, row in roads_df.iterrows():
        from shapely.geometry import Point
        pt = Point(row["centroid_lng"], row["centroid_lat"])
        # Distance in degrees * 111000 = approx metres
        d_water = pt.distance(water_union) * 111000
        d_drain = pt.distance(drain_union) * 111000
        distances_water.append(round(d_water, 2))
        distances_drain.append(round(d_drain, 2))

    roads_df["dist_to_water_m"] = distances_water
    roads_df["dist_to_drain_m"] = distances_drain
    return roads_df

def compute_rainfall_features():
    csv_path = os.path.join(DATA_DIR, "cleaned_rainfall.csv")
    df = pd.read_csv(csv_path)
    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    df = df.dropna(subset=["time"])
    df["rain_val"] = pd.to_numeric(df["precipitation (mm)"], errors="coerce").fillna(0)
    
    # Monthly stats
    df["month"] = df["time"].dt.month
    monthly = df.groupby("month")["rain_val"].agg(["mean","max"]).reset_index()
    monthly.columns = ["month","avg_monthly_rain","max_monthly_rain"]
    
    overall_avg = df["rain_val"].mean()
    overall_max = df["rain_val"].max()
    peak_month  = int(monthly.loc[monthly["avg_monthly_rain"].idxmax(), "month"])
    
    return {
        "overall_avg_mm": round(overall_avg, 3),
        "overall_max_mm": round(overall_max, 3),
        "peak_month": peak_month,
        "monthly_stats": monthly.to_dict("records")
    }

def build_feature_matrix():
    print("Loading roads...")
    roads_df = load_roads()
    print(f"  {len(roads_df)} road segments loaded")

    print("Loading flood labels...")
    flood_map = load_flood_labels()
    print(f"  {len(flood_map)} unique OSM IDs with flood history")

    print("Computing distance to water and drainage...")
    roads_df = compute_distance_to_water(roads_df)

    print("Computing rainfall features...")
    rain_stats = compute_rainfall_features()
    print(f"  Overall avg rainfall: {rain_stats['overall_avg_mm']} mm")
    print(f"  Peak flood month: {rain_stats['peak_month']}")

    # Attach flood labels
    roads_df["flood_count"]   = roads_df["osm_id"].map(lambda x: flood_map.get(x, {}).get("count", 0))
    roads_df["is_flooded"]    = roads_df["osm_id"].map(lambda x: flood_map.get(x, {}).get("is_flooded", 0))

    # Encode highway type
    roads_df["highway_score"] = roads_df["highway"].map(
        lambda h: HIGHWAY_RISK_SCORE.get(h, 3)
    )

    # Add rainfall context (use historical avg as base for training)
    roads_df["avg_rainfall_mm"] = rain_stats["overall_avg_mm"]

    # Build label: 1 = flood risk, 0 = safe
    # Use flood history + highway type + proximity to water
    def make_label(row):
        if row["is_flooded"] == 1 and row["flood_count"] >= 3:
            return 2   # high
        elif row["is_flooded"] == 1 or row["dist_to_water_m"] < 200:
            return 1   # medium
        else:
            return 0   # low

    roads_df["risk_label"] = roads_df.apply(make_label, axis=1)

    # Final feature columns for ML
    features = [
        "highway_score",
        "oneway",
        "bridge",
        "road_length",
        "dist_to_water_m",
        "dist_to_drain_m",
        "flood_count",
        "avg_rainfall_mm",
    ]

    print("\nClass distribution:")
    print(roads_df["risk_label"].value_counts().to_string())

    return roads_df, features

if __name__ == "__main__":
    df, features = build_feature_matrix()
    print("\nFeature matrix sample:")
    print(df[features + ["risk_label","name","highway"]].head(10).to_string())
    out = os.path.join(os.path.dirname(__file__), "features.csv")
    df.to_csv(out, index=False)
    print(f"\nSaved to {out}")
