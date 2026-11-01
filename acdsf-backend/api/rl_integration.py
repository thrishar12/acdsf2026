from flask import Blueprint, jsonify
from database import get_db
import networkx as nx
import state

rl_bp = Blueprint("rl_integration", __name__, url_prefix="/api/rl")

@rl_bp.route("/state/blue", methods=["GET"])
def get_blue_state():
    """Provides environment state for Blue Team RL agent."""
    try:
        with get_db() as conn:
            compromised = conn.execute("SELECT node_id FROM twins WHERE is_compromised = 1").fetchall()
            
        with state.sdn_lock:
            isolated = [n for n in state.sdn_graph.nodes() if state.sdn_graph.degree(n) == 0]
            
        return jsonify({
            "compromised_assets": [r["node_id"] for r in compromised],
            "isolated_assets": isolated,
            "total_assets": len(state.sdn_graph.nodes()) if state.sdn_graph else 0
        })
    except Exception as e:
        return jsonify({"error": "Failed to fetch blue state", "details": str(e)}), 500

@rl_bp.route("/state/red", methods=["GET"])
def get_red_state():
    """Provides environment state for Red Team RL agent."""
    try:
        with get_db() as conn:
            healthy = conn.execute("SELECT node_id FROM twins WHERE is_compromised = 0").fetchall()
            
        return jsonify({
            "available_targets": [r["node_id"] for r in healthy],
            "total_targets": len(healthy)
        })
    except Exception as e:
        return jsonify({"error": "Failed to fetch red state", "details": str(e)}), 500
