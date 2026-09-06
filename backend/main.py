from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import asyncio
from contextlib import asynccontextmanager

from config import settings
from database import Base, engine, SessionLocal
from routers import reports, predict, route, drainage, auth, weather
from models.road_segment import RoadSegment

# Create tables
Base.metadata.create_all(bind=engine)


async def flood_memory_recalculation():
    """Background task to simulate flood risk recalculation."""
    import pandas as pd
    from services import weather
    while True:
        try:
            await asyncio.sleep(60)
            print("[Scheduler] Running flood memory recalculation...")
            db = SessionLocal()
            try:
                roads = db.query(RoadSegment).all()
                for r in roads:
                    if getattr(r, 'centroid_lat', None) and getattr(r, 'centroid_lng', None):
                        w_data = await weather.get_rainfall(r.centroid_lat, r.centroid_lng)
                        r.rainfall_mm = w_data.get("rainfall_mm", 0.0) if isinstance(w_data, dict) else 0.0
                        
                if roads and predict.model:
                    count = 0
                    for r in roads:
                        features = pd.DataFrame([{
                            'rainfall_mm': getattr(r, 'rainfall_mm', 0.0),
                            'elevation_m': getattr(r, 'elevation_m', 10.0),
                            'drainage_score': getattr(r, 'drainage_score', 50.0),
                            'past_flood_count': getattr(r, 'flood_count', 0),
                            'citizen_reports_count': getattr(r, 'citizen_reports_count', 0),
                            'road_type': 1
                        }])
                        prob = predict.model.predict_proba(features)[0][1]
                        
                        if prob < 0.3:
                            risk = "low"
                        elif prob < 0.7:
                            risk = "medium"
                        else:
                            risk = "high"
                            
                        if hasattr(r, 'flood_risk'):
                            r.flood_risk = risk
                        if hasattr(r, 'risk_level'):
                            r.risk_level = risk
                        if hasattr(r, 'risk_probability'):
                            r.risk_probability = prob
                        count += 1
                    db.commit()
                    print(f"[Scheduler] Recalculated risk for {count} roads.")
                    
                    # Update live routing graph if it's loaded
                    from services import routing
                    if routing.G:
                        for r in roads:
                            osm_id = getattr(r, 'osm_id', getattr(r, 'id', ''))
                            parts = str(osm_id).split('-')
                            if len(parts) == 2:
                                try:
                                    u, v = int(parts[0]), int(parts[1])
                                    if routing.G.has_edge(u, v):
                                        for k in routing.G[u][v]:
                                            data = routing.G[u][v][k]
                                            risk_prob = getattr(r, 'risk_probability', 0.0)
                                            data['risk_probability'] = risk_prob
                                            data['risk_level'] = getattr(r, 'flood_risk', 'low')
                                            length = data.get('length', 1.0)
                                            if risk_prob > 0.85:
                                                data['safe_weight'] = float('inf')
                                            else:
                                                data['safe_weight'] = length * (1 + 3.0 * risk_prob)
                                except ValueError:
                                    pass
                else:
                    print("[Scheduler] No roads found or model not loaded.")
            except Exception as e:
                print(f"[Scheduler] Error: {e}")
                db.rollback()
            finally:
                db.close()
                
            print("[Scheduler] Flood memory recalculation cycle complete.")
        except asyncio.CancelledError:
            break

from services.prediction import load_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML model on startup
    load_model()
    from database import SessionLocal
    from services.prediction import precompute_all_segments
    _db = SessionLocal()
    try:
        await precompute_all_segments(_db)
    finally:
        _db.close()
    # Start background task
    task = asyncio.create_task(flood_memory_recalculation())
    yield
    # Cleanup on shutdown
    task.cancel()

app = FastAPI(title="PuddleX API", version="1.0.0", lifespan=lifespan)

port = int(os.getenv("PORT", 8000))

@app.on_event("startup")
async def startup_event():
    print(f"Server starting on port: {port}")
    print(f"ENV: {settings.APP_ENV}")
    print(f"Open-Meteo: {settings.OPEN_METEO_BASE_URL}")
    print(f"Nominatim: {settings.NOMINATIM_BASE_URL}")
    print(f"OSRM: {settings.OSRM_BASE_URL}")
    print(f"Database: {settings.DATABASE_URL}")

# Mount uploads directory to serve images statically
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://puddlex.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """Basic health-check route to confirm backend is running."""
    return HealthResponse(status="ok", message="Backend Connection: OK")

app.include_router(reports.router)
app.include_router(predict.router)
app.include_router(route.router)
app.include_router(drainage.router)
app.include_router(auth.router)
app.include_router(weather.router)
