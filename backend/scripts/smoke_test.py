import urllib.request, json
base="http://127.0.0.1:8000"
print(urllib.request.urlopen(base+"/api/health").read().decode())
req=urllib.request.Request(base+"/api/risk", data=json.dumps({
 "rainfall_mm":128,"slope_deg":42,"elevation_m":2400,
 "soil_moisture":78,"historical_events":5,"infrastructure_density":72
}).encode(), headers={"Content-Type":"application/json"})
print(urllib.request.urlopen(req).read().decode())
