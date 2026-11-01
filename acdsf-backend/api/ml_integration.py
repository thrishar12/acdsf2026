from flask import Blueprint, jsonify
from database import get_db

ml_bp = Blueprint("ml_integration", __name__, url_prefix="/api/ml")

@ml_bp.route("/telemetry", methods=["GET"])
def get_telemetry():
    """
    Provides normalized telemetry data for ML/GNN intrusion detectors.
    """
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT node_id, sector, cpu_load, alert_count, is_compromised FROM twins").fetchall()
        
        telemetry = []
        for r in rows:
            telemetry.append({
                "asset_id": r["node_id"],
                "sector": r["sector"],
                "cpu_usage": r["cpu_load"],
                "alert_count": r["alert_count"],
                "asset_state": "COMPROMISED" if r["is_compromised"] else "NORMAL",
                "timestamp": __import__("datetime").datetime.utcnow().isoformat()
            })
            
        return jsonify(telemetry)
    except Exception as e:
        return jsonify({"error": "Failed to fetch telemetry", "details": str(e)}), 500
