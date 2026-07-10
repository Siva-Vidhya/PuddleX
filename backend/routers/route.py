from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services import routing

router = APIRouter(prefix="/api/route", tags=["routing"])

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float

@router.post("")
def get_routes(req: RouteRequest):
    # Ensure graph is initialized
    routing.init_graph()
    
    start_node = routing.get_nearest_node(req.start_lat, req.start_lng)
    end_node = routing.get_nearest_node(req.end_lat, req.end_lng)
    
    if start_node is None or end_node is None:
        raise HTTPException(status_code=400, detail="Could not map coordinates to graph nodes.")
        
    shortest_route = routing.calculate_route(start_node, end_node, weight_type='distance_weight')
    puddlex_route = routing.calculate_route(start_node, end_node, weight_type='safe_weight')
    
    if not shortest_route or not puddlex_route:
        raise HTTPException(status_code=404, detail="Route not found between these points.")
        
    return {
        "shortest": shortest_route,
        "puddlex": puddlex_route
    }
