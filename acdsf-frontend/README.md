# ACDSF Frontend — React Dashboard

A real, working React app (built with Vite) — tested, compiles with zero
errors — that talks live to your Flask/FastAPI backend services. This is
Member 4's "Human Interface Layer" step, done as a single unified app
instead of 4 separate Grafana dashboards.

## What it does

- **Overview tab**: live KPI cards (from `kpi_report.json`) + network topology diagram + live node health (auto-refreshes every 5s from `digital_twin.py`)
- **Network & SDN tab**: pick a source/target node, check if it's reachable, **actually block/restore it live** via your real `sdn_controller.py` — same demo you already proved works, now with buttons instead of curl commands
- **Threat Intelligence tab**: query your real MITRE ATT&CK knowledge graph (`kg_api.py`) by sector or threat actor name
- **APT Campaign tab**: table view of your real `apt_campaign_log.json` run
- **Explainable AI tab**: shows your SHAP chart and RL training curve

## Setup

### 1. Install Node.js (if you don't have it)

Check first:
```
node --version
```
If that errors, download and install from https://nodejs.org (LTS version).

### 2. Install and run the frontend

```bash
cd acdsf-frontend
npm install
npm run dev
```

This opens the dashboard at `http://localhost:5173` — leave this terminal running.

### 3. Copy static files into `public/`

The dashboard reads some files as static assets. Copy these into `acdsf-frontend/public/`:
```
copy ..\member1\topology.png public\
copy ..\member4\kpi_report.json public\
copy ..\member4\shap_explanation.png public\
copy ..\member2\apt_campaign_log.json public\
copy ..\member2\red_agent_training_curve.png public\
```
(adjust paths to wherever your actual folders are)

### 4. Enable CORS on your backend services

Browsers block requests from `localhost:5173` (the React app) to `localhost:5000/8000/8002`
(your Flask/FastAPI services) unless those services explicitly allow it. Add this:

**For `digital_twin.py` and `sdn_controller.py` (Flask):**
```bash
pip install flask-cors --break-system-packages
```
Add near the top of each file, right after `app = Flask(__name__)`:
```python
from flask_cors import CORS
CORS(app)
```

**For `kg_api.py` (FastAPI):**
Add near the top, after `app = FastAPI(...)`:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

### 5. Run everything together

You'll need these running simultaneously, each in its own terminal:
```
python network_topology.py          # (member1, run once to generate topology.json)
python digital_twin.py              # (member1, port 5000)
python sdn_controller.py            # (member1, port 8000)
python knowledge_graph.py --serve   # (member2, port 8002)
npm run dev                         # (frontend, port 5173)
```

Then open `http://localhost:5173` in your browser.

## Build for submission (optional)

If you want a static, shareable version instead of the dev server:
```bash
npm run build
```
This creates a `dist/` folder you can open `dist/index.html` from directly (though live API calls still need the backend services running).
