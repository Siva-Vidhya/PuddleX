import osmnx as ox
import networkx as nx
import random
import json
from database import SessionLocal
from models.road_segment import RoadSegment
from services import weather

# Module-level variable to hold the loaded graph
G = None

def init_graph(place_name="T Nagar, Chennai, India"):
    global G
    if G is not None:
        return
    print(f"Loading OSMnx graph for {place_name}...")
    try:
        # Load the graph around the target area instead of by place name to avoid polygon resolution errors
        G = ox.graph_from_point((13.0428, 80.2378), dist=3000, network_type='drive')
        
        db = SessionLocal()
        try:
            new_segments = []
            for u, v, key, data in G.edges(keys=True, data=True):
                edge_id = f"{u}-{v}"
                length = data.get('length', 1.0)
                
                db_seg = db.query(RoadSegment).filter(RoadSegment.id == edge_id).first()
                if not db_seg:
                    u_lat, u_lng = G.nodes[u]['y'], G.nodes[u]['x']
                    elev = weather.get_elevation(u_lat, u_lng)
                    rain = weather.get_rainfall(u_lat, u_lng)
                    
                    if 'geometry' in data:
                        coords = list(data['geometry'].coords)
                    else:
                        v_lat, v_lng = G.nodes[v]['y'], G.nodes[v]['x']
                        coords = [(u_lng, u_lat), (v_lng, v_lat)]
                    latlng_coords = [[lat, lng] for lng, lat in coords]
                    
                    name = data.get('name', 'Unknown Road')
                    if isinstance(name, list): name = name[0]
                    
                    db_seg = RoadSegment(
                        id=edge_id,
                        name=name,
                        coordinates_json=json.dumps(latlng_coords),
                        rainfall_mm=rain,
                        elevation_m=elev,
                        drainage_score=50.0,
                        past_flood_count=0,
                        citizen_reports_count=0,
                        road_type=1,
                        risk_level="low",
                        risk_probability=0.0
                    )
                    db.add(db_seg)
                    # flush every 100 to avoid locking up too much memory
                    if len(db.new) > 100:
                        db.flush()
                
                # Use DB value for edge costs
                risk_prob = db_seg.risk_probability
                data['risk_probability'] = risk_prob
                data['risk_level'] = db_seg.risk_level
                
                # Compute costs
                flood_risk_weight = 3.0
                data['distance_weight'] = length
                
                if risk_prob > 0.85:
                    data['safe_weight'] = float('inf') # Impassable
                else:
                    data['safe_weight'] = length * (1 + flood_risk_weight * risk_prob)
            
            db.commit()
            print("Graph loaded and DB synced successfully.")
        except Exception as e:
            db.rollback()
            print(f"DB Sync error in routing: {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"Failed to load graph: {e}")

def get_nearest_node(lat, lng):
    global G
    if G is None:
        return None
    # osmnx uses (X, Y) which is (lng, lat)
    return ox.distance.nearest_nodes(G, X=lng, Y=lat)

def calculate_route(start_node, end_node, weight_type='distance_weight'):
    global G
    if G is None:
        return None
    
    try:
        route_nodes = nx.shortest_path(G, start_node, end_node, weight=weight_type)
        
        segments = []
        total_distance = 0.0
        
        for u, v in zip(route_nodes[:-1], route_nodes[1:]):
            # G is a MultiDiGraph, get the edge with minimum weight
            edge_data = min(G.get_edge_data(u, v).values(), key=lambda x: x.get(weight_type, float('inf')))
            
            total_distance += edge_data.get('length', 0.0)
            
            # Get geometry
            if 'geometry' in edge_data:
                coords = list(edge_data['geometry'].coords)
            else:
                u_lat, u_lng = G.nodes[u]['y'], G.nodes[u]['x']
                v_lat, v_lng = G.nodes[v]['y'], G.nodes[v]['x']
                coords = [(u_lng, u_lat), (v_lng, v_lat)]
                
            # Convert to [lat, lng] for frontend
            latlng_coords = [[lat, lng] for lng, lat in coords]
            
            name = edge_data.get('name', 'Unknown Road')
            if isinstance(name, list):
                name = name[0]
                
            segments.append({
                "id": f"{u}-{v}",
                "name": name,
                "coordinates": latlng_coords,
                "risk": edge_data.get('risk_level', 'low'),
                "recentRainfall": "Simulated",
                "lastReportedFlood": None
            })
            
        # Estimate duration (rough estimate assuming 30 km/h avg speed)
        # 30 km/h = 500 m/min
        duration_mins = max(1, int(total_distance / 500))
        distance_km = round(total_distance / 1000, 2)
        
        return {
            "id": f"route-{weight_type}",
            "type": "shortest" if weight_type == 'distance_weight' else "puddlex",
            "segments": segments,
            "durationStr": f"{duration_mins} mins",
            "distanceStr": f"{distance_km} km"
        }
    except nx.NetworkXNoPath:
        return None
