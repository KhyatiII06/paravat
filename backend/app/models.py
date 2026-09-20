from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from .db import Base

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    reporter = Column(String(120), default="anonymous")
    incident_type = Column(String(80), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rainfall_mm = Column(Float, default=0)
    slope_deg = Column(Float, default=0)
    severity = Column(Float, default=3)
    description = Column(Text, default="")
    region = Column(String(50), default="demo")
    photo_path = Column(String(255), nullable=True)
    ai_label = Column(String(80), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_match = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Infrastructure(Base):
    __tablename__ = "infrastructure"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    kind = Column(String(50), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    criticality = Column(Float, default=0.5)
    status = Column(String(30), default="operational")
