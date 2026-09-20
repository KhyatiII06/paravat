# PARVAT — Himalayan Intelligence Prototype

A cinematic, responsive prototype combining a mountain-risk concept, a working infrastructure-cascade API, an ML risk-scoring endpoint, incident reporting, and a browser-based offline-assistance demo.

## Important scope & safety

- The included risk model was trained on **synthetic** data. Its score is for demonstration only, not an operational forecast or validated hazard prediction.
- The dependency graph and sample map points are illustrative. They are not verified locations, safe routes, shelters, or rescue services.
- “I'm Stuck” can request device geolocation (requires a secure context such as localhost/HTTPS and user permission) and render a local demo map. It does **not** dispatch rescue, perform hazard-aware routing, or include a real regional offline map pack.
- Service worker caches the app shell only. Regional map tiles, satellite imagery, live weather, and live satellite feeds are not included.
- Never put secret API keys in frontend JavaScript. Configure secrets only in backend environment variables; this prototype currently requires no external API key.

## Quick start (Windows)

1. Install Python 3.11+.
2. Open a terminal in `PARVAT/backend`.
3. Create and activate a virtual environment:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
4. Seed the sample infrastructure and start the API:
   ```powershell
   python -m app.seed
   uvicorn app.main:app --reload --port 8000
   ```
5. In a second terminal, run the frontend:
   ```powershell
   cd ..\frontend
   py serve.py
   ```
6. Open `http://127.0.0.1:5500`. API docs: `http://127.0.0.1:8000/docs`.

If PowerShell blocks activation, run `.venv\Scripts\python.exe -m pip install -r requirements.txt`, then use `.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`.

## Included capabilities

- Cinematic landing page with Uttarakhand, Himachal Pradesh and Nepal entry points.
- Command center, incident reporting and mountain-memory views from the original project.
- Fixed What-If request contract (`failed_node`) and all eight dependency nodes.
- Existing scikit-learn model artifact and synthetic training CSV, plus training script.
- “I'm Stuck” page with device location permission, connection indicator, fictional offline map canvas and clear safety limitations.
- Service worker caches the app shell for repeat visits. Serve via localhost; opening files directly with `file://` will not enable service workers.

## API endpoints

- `GET /api/health`
- `GET /api/infrastructure`
- `GET /api/incidents`, `POST /api/incidents`
- `POST /api/simulate` with `failed_node`, `rainfall_mm`, `severity`
- `POST /api/risk` with `rainfall_mm`, `slope_deg`, `elevation_m`, `soil_moisture`, `historical_events`, `infrastructure_density`
- `GET /api/memory`

## Next steps before real-world use

Acquire licensed/authoritative geospatial data; build and test downloadable region packs; validate facility and route data with local authorities; implement hazard-aware routing and stale-data warnings; connect official weather/alert feeds with attribution and timestamps; evaluate ML on representative, labeled data; add robust privacy/security controls and emergency communications only through supported providers.
