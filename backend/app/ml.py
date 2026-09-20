from pathlib import Path
import joblib
import numpy as np

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.joblib"

FEATURES = [
    "rainfall_mm", "slope_deg", "elevation_m",
    "soil_moisture", "historical_events", "infrastructure_density"
]

def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Risk model missing. Run: python scripts/train_model.py")
    return joblib.load(MODEL_PATH)

def predict(payload):
    model = load_model()
    x = np.array([[payload[f] for f in FEATURES]], dtype=float)
    probability = float(model.predict_proba(x)[0, 1])
    score = round(probability * 100, 1)
    band = "LOW" if score < 30 else "MODERATE" if score < 60 else "HIGH" if score < 80 else "CRITICAL"

    drivers = []
    if payload["rainfall_mm"] >= 100: drivers.append("high rainfall")
    if payload["slope_deg"] >= 35: drivers.append("steep slope")
    if payload["soil_moisture"] >= 70: drivers.append("high soil moisture")
    if payload["historical_events"] >= 4: drivers.append("repeated historical events")
    if payload["infrastructure_density"] >= 70: drivers.append("dense critical infrastructure")
    if not drivers: drivers.append("no dominant trigger detected")

    return {
        "risk_probability": round(probability, 4),
        "risk_score": score,
        "band": band,
        "drivers": drivers
    }
