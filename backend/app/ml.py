from pathlib import Path
import joblib
import numpy as np


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.joblib"

_model = None


def get_model():
    global _model

    if _model is None:
        loaded = joblib.load(MODEL_PATH)

        # The training script saves a dictionary containing the model.
        if isinstance(loaded, dict):
            _model = loaded.get("model", loaded)
        else:
            _model = loaded

    return _model


def predict(payload):
    model = get_model()

    features = np.array([[
        payload["rainfall_mm"],
        payload["slope_deg"],
        payload["elevation_m"],
        payload["soil_moisture"],
        payload["historical_events"],
        payload["infrastructure_density"],
    ]], dtype=float)

    probability = float(model.predict_proba(features)[0, 1])

    risk_score = round(probability * 100, 2)

    if risk_score >= 70:
        level = "HIGH"
    elif risk_score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "probability": probability,
       "hazard": payload.get("hazard", "unknown"),
"severity": payload.get("severity", 0),
    }