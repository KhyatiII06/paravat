import networkx as nx

HAZARD_TO_NODE = {
    "bridge": "B01", "road": "R01", "communication": "C01", "network": "C01",
    "power": "P01", "hospital": "H01", "village": "V01", "water": "W01",
    "landslide": "R01", "flood": "W01", "snowfall": "R01", "forest_fire": "V01",
    "infrastructure_failure": "B01",
}

def build_graph():
    g = nx.DiGraph()
    nodes = [
        ("B01", "Bridge", 0.95), ("R01", "Road", 0.90), ("V01", "Village", 0.85),
        ("H01", "Hospital", 1.00), ("S01", "School", 0.55), ("W01", "Water", 0.80),
        ("P01", "Power", 0.75), ("C01", "Comms", 0.65),
    ]
    for n, kind, criticality in nodes:
        g.add_node(n, kind=kind, criticality=criticality)
    g.add_edges_from([
        ("B01", "R01"), ("R01", "V01"), ("R01", "H01"), ("V01", "S01"),
        ("V01", "W01"), ("V01", "P01"), ("P01", "C01"), ("C01", "H01")
    ])
    return g

def simulate(failed_node: str, rainfall_mm: float, severity: float, hazard: str = "infrastructure_failure"):
    g = build_graph()
    if failed_node not in g:
        return {"error": "Unknown dependency node", "available_nodes": list(g.nodes)}

    affected = set(nx.descendants(g, failed_node)) | {failed_node}
    hazard_multiplier = {
        "landslide": 1.20, "flood": 1.15, "snowfall": 1.05, "forest_fire": 1.10,
        "bridge": 1.10, "road": 1.05, "communication": 0.95, "network": 0.95,
        "power": 1.0, "infrastructure_failure": 1.0,
    }.get(hazard, 1.0)
    rain_factor = min(1.5, 0.65 + rainfall_mm / 300)
    results = []
    for node in affected:
        d = g.nodes[node]
        impact = min(100, round(d["criticality"] * severity * rain_factor * hazard_multiplier * 100, 1))
        results.append({
            "node": node, "kind": d["kind"], "impact": impact,
            "status": "critical" if impact >= 70 else "degraded" if impact >= 35 else "watch"
        })
    results.sort(key=lambda x: x["impact"], reverse=True)
    return {
        "failed_node": failed_node, "hazard": hazard, "rainfall_mm": rainfall_mm,
        "severity": severity, "affected_count": len(affected), "cascade": results,
        "recommended_priority": [r["node"] for r in results[:3]],
        "headline": f"{hazard.replace('_',' ').title()} cascade from {g.nodes[failed_node]['kind']}"
    }
