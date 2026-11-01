import uuid
from flask import Blueprint, jsonify, request
from auth import require_auth
from orchestration.engine import orchestrator
from orchestration.registry import get_scenario_class

orchestration_bp = Blueprint("orchestration", __name__, url_prefix="/api/orchestration")

@orchestration_bp.route("/attacks", methods=["POST"])
@require_auth
def launch_attack():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
        
    body = request.get_json(silent=True) or {}
    attack_type = body.get("attack_type")
    target = body.get("target")
    
    if not attack_type or not target:
        return jsonify({"error": "attack_type and target are required"}), 400
        
    scenario_cls = get_scenario_class(attack_type)
    if not scenario_cls:
        return jsonify({"error": f"Unknown attack type: {attack_type}"}), 400
        
    attack_id = str(uuid.uuid4())
    scenario = scenario_cls(attack_id, target, **body)
    
    orchestrator.launch_attack(scenario)
    
    return jsonify({
        "status": "launched",
        "attack_id": attack_id,
        "attack_type": attack_type,
        "target": target
    })

@orchestration_bp.route("/attacks", methods=["GET"])
def list_attacks():
    return jsonify(orchestrator.list_attacks())

@orchestration_bp.route("/attacks/<attack_id>", methods=["GET"])
def get_attack(attack_id):
    status = orchestrator.get_attack_status(attack_id)
    if not status:
        return jsonify({"error": "Attack not found"}), 404
    return jsonify(status)

@orchestration_bp.route("/attacks/<attack_id>/cancel", methods=["POST"])
@require_auth
def cancel_attack(attack_id):
    success = orchestrator.cancel_attack(attack_id)
    if not success:
        return jsonify({"error": "Attack not found or already completed"}), 404
    return jsonify({"status": "cancelled", "attack_id": attack_id})
