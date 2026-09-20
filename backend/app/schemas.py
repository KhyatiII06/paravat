from pydantic import BaseModel, Field
from typing import Optional

class RiskRequest(BaseModel):
    rainfall_mm: float = Field(ge=0, le=1000)
    slope_deg: float = Field(ge=0, le=90)
    elevation_m: float = Field(ge=0, le=9000)
    soil_moisture: float = Field(ge=0, le=100)
    historical_events: int = Field(ge=0, le=100)
    infrastructure_density: float = Field(ge=0, le=100)

class IncidentRequest(BaseModel):
    reporter: str = "anonymous"
    incident_type: str
    latitude: float
    longitude: float
    rainfall_mm: float = 0
    slope_deg: float = 0
    severity: float = Field(default=3, ge=1, le=5)
    description: str = ""
    region: str = "demo"
    expected_type: Optional[str] = None

class SimulationRequest(BaseModel):
    failed_node: str
    rainfall_mm: float = Field(default=120, ge=0, le=500)
    severity: float = Field(default=0.8, ge=0, le=1)
    hazard: str = "infrastructure_failure"

class VerifyRequest(BaseModel):
    expected_type: str
