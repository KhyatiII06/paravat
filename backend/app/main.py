from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from .db import Base, engine, get_db
from .models import Incident, Infrastructure
from .schemas import RiskRequest, IncidentRequest, SimulationRequest
from .ml import predict
from .simulation import simulate
from .regions import REGIONS
from .weather import region_weather
from .vision import verify_image
from .assets_data import REGION_ASSETS

Base.metadata.create_all(bind=engine)

# Lightweight prototype migration so an existing parvat.db gains the v2 incident fields.
with engine.begin() as conn:
    existing = {row[1] for row in conn.execute(text("PRAGMA table_info(incidents)"))}
    for column, sql_type in [("region", "VARCHAR(50)"), ("ai_label", "VARCHAR(80)"), ("ai_confidence", "FLOAT"), ("ai_match", "VARCHAR(30)")]:
        if column not in existing:
            conn.execute(text(f"ALTER TABLE incidents ADD COLUMN {column} {sql_type}"))

app = FastAPI(title="PARVAT API", version="2.0.0", description="Himalayan resilience intelligence prototype.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

DEMO_LOCATIONS = {
    "uttarakhand": {"name": "North Valley Demo", "lat": 30.6800, "lon": 78.5100, "note": "Fictional prototype point"},
    "himachal": {"name": "Upper Valley Demo", "lat": 32.2400, "lon": 77.1900, "note": "Fictional prototype point"},
    "nepal": {"name": "Central Mountain Demo", "lat": 28.2200, "lon": 84.2400, "note": "Fictional prototype point"},
}

@app.get("/")
def root():
    return {"name": "PARVAT", "status": "online", "docs": "/docs", "version": "2.0"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "parvat-backend", "version": "2.0"}

@app.get("/api/regions")
def regions():
    return [{"key": k, "name": v["name"], "country": v["country"], "lat": v["lat"], "lon": v["lon"], "guidance": v["guidance"]} for k, v in REGIONS.items()]

@app.get("/api/regions/{region}/weather")
def weather(region: str):
    if region not in REGIONS:
        raise HTTPException(404, "Unknown region")
    return region_weather(region)

@app.get("/api/demo-locations")
def demo_locations():
    return DEMO_LOCATIONS

@app.get("/api/regions/{region}/assets")
def region_assets(region: str):
    if region not in REGION_ASSETS:
        raise HTTPException(404, "Unknown region")
    return {"region": region, "assets": REGION_ASSETS[region], "prototype": True}

@app.post("/api/risk", tags=["Risk Intelligence"])
def risk(payload: RiskRequest):
    return predict(payload.model_dump())

@app.post("/api/simulate", tags=["What-If Engine"])
def what_if(payload: SimulationRequest):
    result = simulate(payload.failed_node, payload.rainfall_mm, payload.severity, payload.hazard)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result)
    return result

@app.post("/api/incidents", tags=["Citizen Observers"])
def create_incident(payload: IncidentRequest, db: Session = Depends(get_db)):
    item = Incident(**payload.model_dump(exclude={"expected_type"}))
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "status": "received", "message": "Observation stored by PARVAT.", "expected_type": payload.expected_type}

@app.post("/api/incidents/{incident_id}/photo", tags=["Citizen Observers"])
async def upload_photo(incident_id: int, expected_type: str = Form("landslide"), file: UploadFile = File(...), db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    ext = Path(file.filename or "").suffix.lower()[:10]
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(400, "Use JPG, JPEG, PNG or WEBP")
    target = UPLOAD_DIR / f"incident_{incident_id}{ext}"
    target.write_bytes(await file.read())
    result = verify_image(str(target), expected_type)
    incident.photo_path = str(target)
    incident.ai_label = result.get("label")
    incident.ai_confidence = result.get("confidence")
    incident.ai_match = result.get("match")
    db.commit()
    return {"status": "uploaded", "incident_id": incident_id, "verification": result}

@app.get("/api/incidents", tags=["Citizen Observers"])
def list_incidents(db: Session = Depends(get_db)):
    rows = db.query(Incident).order_by(desc(Incident.created_at)).limit(100).all()
    return [{
        "id": r.id, "reporter": r.reporter, "incident_type": r.incident_type,
        "latitude": r.latitude, "longitude": r.longitude, "rainfall_mm": r.rainfall_mm,
        "slope_deg": r.slope_deg, "severity": r.severity, "description": r.description,
        "region": r.region, "ai_label": r.ai_label, "ai_confidence": r.ai_confidence,
        "ai_match": r.ai_match, "created_at": r.created_at.isoformat()
    } for r in rows]

@app.get("/api/infrastructure", tags=["Digital Twin"])
def infrastructure(db: Session = Depends(get_db)):
    rows = db.query(Infrastructure).all()
    return [{"id": r.id, "name": r.name, "kind": r.kind, "latitude": r.latitude, "longitude": r.longitude, "criticality": r.criticality, "status": r.status} for r in rows]

@app.get("/api/memory", tags=["Mountain Memory"])
def memory(db: Session = Depends(get_db)):
    rows = db.query(Incident).order_by(desc(Incident.created_at)).limit(50).all()
    type_counts = {}
    for r in rows: type_counts[r.incident_type] = type_counts.get(r.incident_type, 0) + 1
    return {"recent_incidents": len(rows), "by_type": type_counts, "note": "Prototype memory store. Validate historical archives before operational use."}
