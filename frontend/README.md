# PARVAT Frontend Redesign
Frontend-only replacement. Backend is untouched.

Local:
1. Keep FastAPI running on http://127.0.0.1:8000
2. In this folder run: python -m http.server 5500
3. Open http://127.0.0.1:5500

For deployment edit assets/config.js:
window.PARVAT_API="https://YOUR-BACKEND-URL";

Pages: cinematic intro, Command Center, What-If Engine, Citizen Observer, Mountain Memory.
