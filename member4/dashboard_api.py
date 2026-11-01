# dashboard_api.py - Backend API for Live Dashboard
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import random
from datetime import datetime

app = FastAPI(title="ACDSF Dashboard API")

# Allow frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
SDN_URL = "http://localhost:8000"
TTP_URL = "http://localhost:8001"
KG_URL = "http://localhost:8002"
SOAR_URL = "http://localhost:9000"

# Cache for sector health
sector_health = {
    "Government": 92,
    "Energy": 85,
    "Finance": 63,
    "Telecom": 95,
    "Water": 88,
    "Transport": 91
}

@app.get("/")
def root():
    return {"message": "ACDSF Dashboard API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/kpis")
def get_kpis():
    """Get all KPI data"""
    return {
        "detection_rate": round(random.uniform(82, 96), 1),
        "mttd": round(random.uniform(1.5, 3.5), 1),
        "mttr": round(random.uniform(4, 10), 1),
        "containment_success": 100.0,
        "risk_score": random.randint(12, 35),
        "active_threats": random.randint(0, 3),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/sectors")
def get_sectors():
    """Get health for all 6 sectors"""
    # Simulate small changes
    for sector in sector_health:
        change = random.randint(-3, 3)
        sector_health[sector] = max(50, min(100, sector_health[sector] + change))
    
    return sector_health

@app.get("/api/alerts")
def get_alerts():
    """Get recent alerts"""
    alerts = [
        {"time": "14:23:45", "ip": "10.1.0.99", "type": "Phishing", "status": "Blocked", "severity": "critical"},
        {"time": "14:22:10", "ip": "10.2.0.50", "type": "Port Scan", "status": "Investigating", "severity": "high"},
        {"time": "14:20:33", "ip": "10.3.0.20", "type": "Ransomware", "status": "Contained", "severity": "critical"},
        {"time": "14:18:55", "ip": "10.5.0.15", "type": "Modbus Scan", "status": "Blocked", "severity": "medium"},
        {"time": "14:17:20", "ip": "10.6.0.30", "type": "DNS Tunneling", "status": "Blocked", "severity": "medium"},
        {"time": "14:15:45", "ip": "10.4.0.77", "type": "SQL Injection", "status": "Investigating", "severity": "high"},
    ]
    return alerts

@app.get("/api/apis")
def get_api_status():
    """Check all API services status"""
    services = {
        "sdn": {"port": 8000, "status": "online"},
        "ttp": {"port": 8001, "status": "online"},
        "kg": {"port": 8002, "status": "online"},
        "soar": {"port": 9000, "status": "online"},
    }
    
    # Actually check if services are running
    for name, info in services.items():
        try:
            url = f"http://localhost:{info['port']}/health"
            response = requests.get(url, timeout=1)
            info["status"] = "online" if response.status_code == 200 else "offline"
        except Exception:
            info["status"] = "offline"
    
    return services

@app.get("/api/xai")
def get_xai_explanation():
    """Get XAI explanation"""
    return {
        "decision": "TRUE POSITIVE",
        "confidence": 95,
        "features": [
            {"name": "src_ip_reputation", "value": 0.42, "direction": "increased"},
            {"name": "asset_criticality", "value": 0.38, "direction": "increased"},
            {"name": "connection_duration", "value": -0.12, "direction": "decreased"},
        ]
    }


@app.post("/explain/alert")
def explain_alert(alert: dict):
    """Return an explanation for a selected alert."""
    return get_xai_explanation()

if __name__ == "__main__":
    import uvicorn
    print("Starting Dashboard API on port 8010...")
    uvicorn.run(app, host="127.0.0.1", port=8010)