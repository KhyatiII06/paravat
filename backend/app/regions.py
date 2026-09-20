from __future__ import annotations

# Demo monitoring points. These are region-level coordinates, not rescue locations.
REGIONS = {
    "uttarakhand": {
        "name": "Uttarakhand",
        "country": "India",
        "lat": 30.0668,
        "lon": 79.0193,
        "color": "mint",
        "guidance": "Watch steep-slope roads, river crossings and bridge approaches during heavy rainfall.",
        "monitor_points": [
            {"name": "North Valley Demo", "lat": 30.68, "lon": 78.51},
            {"name": "Upper Alaknanda Demo", "lat": 30.28, "lon": 79.08},
        ],
    },
    "himachal": {
        "name": "Himachal Pradesh",
        "country": "India",
        "lat": 31.1048,
        "lon": 77.1734,
        "color": "amber",
        "guidance": "Watch mountain highways, valley slopes and low-lying crossings after intense rain.",
        "monitor_points": [
            {"name": "Upper Valley Demo", "lat": 32.24, "lon": 77.19},
            {"name": "Hillside Demo", "lat": 31.10, "lon": 77.17},
        ],
    },
    "nepal": {
        "name": "Nepal",
        "country": "Nepal",
        "lat": 28.3949,
        "lon": 84.1240,
        "color": "blue",
        "guidance": "Watch river corridors, mountain trails and road cuttings when rainfall intensity rises.",
        "monitor_points": [
            {"name": "Central Mountain Demo", "lat": 28.22, "lon": 84.24},
            {"name": "Hillside Demo", "lat": 27.72, "lon": 85.32},
        ],
    },
}


def get_region(name: str):
    return REGIONS.get(name.lower())
