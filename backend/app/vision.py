from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import joblib
import numpy as np
from PIL import Image
from urllib.request import Request, urlopen

LABELS = ["landslide", "flash flood", "road damage", "bridge damage", "snow blockage", "normal mountain scene"]


def _extract_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                pass
    return None


def _local_model(path: str, expected_type: str):
    model_path = Path(__file__).resolve().parents[1] / "models" / "vision_model.joblib"
    if not model_path.exists():
        return None
    try:
        im = Image.open(path).convert("RGB").resize((32, 32))
        x = np.asarray(im, dtype=np.float32).reshape(1, -1) / 255.0
        model = joblib.load(model_path)
        label = str(model.predict(x)[0])
        confidence = None
        if hasattr(model, "predict_proba"):
            confidence = float(max(model.predict_proba(x)[0]))
        expected = expected_type.replace("_", " ").lower()
        normalized = label.replace("_", " ").lower()
        aliases = {"flash flood": "flash flood", "flood": "flash flood", "landslide": "landslide", "bridge damage": "bridge damage", "road damage": "road damage"}
        match = "MATCH" if aliases.get(expected, expected) == aliases.get(normalized, normalized) else "MISMATCH"
        return {"available": True, "verified": match == "MATCH", "label": label, "confidence": confidence, "match": match, "message": "Local prototype vision model completed."}
    except Exception as exc:
        return {"available": True, "verified": False, "label": None, "confidence": None, "match": "UNCERTAIN", "message": f"Local vision model error: {exc}"}


def verify_image(path: str, expected_type: str) -> dict:
    """Use a locally trained prototype model when available, otherwise an optional multimodal provider.
    Without a vision provider the API deliberately says so instead of pretending a
    heuristic is an AI diagnosis.
    """
    local = _local_model(path, expected_type)
    if local is not None:
        return local
    key = os.getenv("PARVAT_VISION_API_KEY")
    base = os.getenv("PARVAT_VISION_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("PARVAT_VISION_MODEL", "gpt-4.1-mini")
    if not key:
        return {
            "available": False,
            "verified": False,
            "label": None,
            "confidence": None,
            "match": "unverified",
            "message": "Vision verification is not configured. The photo was stored, but PARVAT will not pretend an image classifier ran.",
        }

    data = Path(path).read_bytes()
    mime = "image/jpeg" if path.lower().endswith((".jpg", ".jpeg")) else "image/png"
    b64 = base64.b64encode(data).decode()
    prompt = (
        "You are PARVAT's hazard photo verifier. Classify the visible scene into exactly one of: "
        + ", ".join(LABELS)
        + ". Compare it with the user's selected incident type. Return ONLY JSON with keys "
        "label, confidence, match, reason. match must be MATCH, MISMATCH, or UNCERTAIN. "
        f"Selected incident type: {expected_type}."
    )
    payload = {
        "model": model,
        "temperature": 0,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        ]}],
    }
    req = Request(
        f"{base.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=25) as response:
            body = json.loads(response.read().decode())
        content = body["choices"][0]["message"]["content"]
        parsed = _extract_json(content) or {}
        label = str(parsed.get("label") or "uncertain").lower()
        match = str(parsed.get("match") or "UNCERTAIN").upper()
        return {
            "available": True,
            "verified": match == "MATCH",
            "label": label,
            "confidence": float(parsed.get("confidence", 0) or 0),
            "match": match,
            "reason": parsed.get("reason", ""),
            "message": "Vision verification completed.",
        }
    except Exception as exc:
        return {
            "available": True,
            "verified": False,
            "label": None,
            "confidence": None,
            "match": "UNCERTAIN",
            "message": f"Vision provider error: {exc}",
        }
