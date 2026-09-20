from __future__ import annotations

import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .regions import REGIONS

CACHE: dict[str, tuple[float, dict]] = {}
CACHE_SECONDS = 600


def _fetch(lat: float, lon: float) -> dict:
    params = urlencode({
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m",
        "hourly": "precipitation,rain,weather_code,soil_moisture_0_to_7cm",
        "forecast_days": 2,
        "timezone": "auto",
    })
    req = Request(
        f"https://api.open-meteo.com/v1/forecast?{params}",
        headers={"User-Agent": "PARVAT-hackathon-prototype/2.0"},
    )
    with urlopen(req, timeout=8) as response:
        return json.loads(response.read().decode("utf-8"))


def _risk_label(current: dict, hourly: dict) -> tuple[str, float, list[str]]:
    rain = float(current.get("rain", 0) or 0)
    precip = float(current.get("precipitation", 0) or 0)
    wind = float(current.get("wind_speed_10m", 0) or 0)
    soil = hourly.get("soil_moisture_0_to_7cm", []) or []
    future_rain = sum(float(x or 0) for x in (hourly.get("rain", []) or [])[:12])
    moisture = sum(float(x or 0) for x in soil[:12]) / max(1, len(soil[:12]))

    score = min(100, rain * 8 + precip * 4 + future_rain * 1.2 + wind * 0.15 + moisture * 35)
    drivers = []
    if rain >= 4 or future_rain >= 25:
        drivers.append("heavy-rain signal")
    if future_rain >= 50:
        drivers.append("high 12-hour rainfall accumulation")
    if moisture >= 0.35:
        drivers.append("elevated near-surface soil moisture")
    if wind >= 35:
        drivers.append("strong wind")
    if not drivers:
        drivers.append("no dominant weather trigger")

    band = "LOW" if score < 30 else "WATCH" if score < 55 else "HIGH" if score < 75 else "CRITICAL"
    return band, round(score, 1), drivers


def region_weather(region_key: str) -> dict:
    region = REGIONS[region_key]
    now = time.time()
    cached = CACHE.get(region_key)
    if cached and now - cached[0] < CACHE_SECONDS:
        return cached[1]

    try:
        data = _fetch(region["lat"], region["lon"])
        current = data.get("current", {})
        hourly = data.get("hourly", {})
        band, score, drivers = _risk_label(current, hourly)
        result = {
            "region": region_key,
            "name": region["name"],
            "country": region["country"],
            "source": "Open-Meteo forecast",
            "source_time": data.get("current", {}).get("time"),
            "timezone": data.get("timezone"),
            "coordinates": {"lat": region["lat"], "lon": region["lon"]},
            "current": {
                "temperature_c": current.get("temperature_2m"),
                "humidity": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "rain_mm": current.get("rain"),
                "wind_kmh": current.get("wind_speed_10m"),
                "weather_code": current.get("weather_code"),
            },
            "risk": {"band": band, "score": score, "drivers": drivers},
            "guidance": region["guidance"],
            "hourly": {
                "time": (hourly.get("time") or [])[:24],
                "rain": (hourly.get("rain") or [])[:24],
                "precipitation": (hourly.get("precipitation") or [])[:24],
                "weather_code": (hourly.get("weather_code") or [])[:24],
            },
            "live": True,
        }
    except Exception as exc:
        # The UI remains usable if a demo network has no internet.
        result = {
            "region": region_key,
            "name": region["name"],
            "country": region["country"],
            "source": "offline prototype fallback",
            "source_time": None,
            "timezone": "",
            "coordinates": {"lat": region["lat"], "lon": region["lon"]},
            "current": {"temperature_c": None, "humidity": None, "precipitation_mm": None, "rain_mm": None, "wind_kmh": None, "weather_code": None},
            "risk": {"band": "WATCH", "score": None, "drivers": ["live weather unavailable"]},
            "guidance": region["guidance"],
            "hourly": {"time": [], "rain": [], "precipitation": [], "weather_code": []},
            "live": False,
            "error": str(exc),
        }

    CACHE[region_key] = (now, result)
    return result
