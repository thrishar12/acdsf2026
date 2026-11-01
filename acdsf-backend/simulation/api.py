"""
ACDSF — Simulation Blueprint API
===================================
Provides REST endpoints and SSE real-time event streaming for the
Red vs Blue AI cyber warfare simulation engine.
"""

import json
import logging
import queue
import time
from flask import Blueprint, Response, jsonify, request, stream_with_context

from simulation.engine import simulation_engine
from simulation.scenarios import (
    KILL_CHAIN_STAGES,
    RED_TECHNIQUES,
    BLUE_ACTIONS,
    SOAR_PLAYBOOKS,
    get_scenario_config,
)

logger = logging.getLogger("acdsf.simulation.api")

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@simulation_bp.route("/status", methods=["GET"])
def get_simulation_status():
    """Get the current live status of the simulation engine."""
    return jsonify(simulation_engine.get_status())


@simulation_bp.route("/start", methods=["POST"])
def start_simulation():
    """
    Start a new simulation run.
    Accepts config: {
        scenario: str ("APT" | "RANSOMWARE" | "DDOS" | "INSIDER"),
        rounds: int (1 - 100, default 10),
        speed: float (0.25 - 10.0, default 1.0),
        target_sector: str (optional, e.g. "finance"),
        red_difficulty: str ("easy" | "medium" | "hard" | "apt_stealth"),
        blue_mode: str ("autonomous" | "conservative" | "aggressive")
    }
    """
    payload = request.get_json(silent=True) or {}
    result = simulation_engine.start(payload)
    status_code = 400 if "error" in result else 200
    return jsonify(result), status_code


@simulation_bp.route("/pause", methods=["POST"])
def pause_simulation():
    """Pause the running simulation."""
    result = simulation_engine.pause()
    status_code = 400 if "error" in result else 200
    return jsonify(result), status_code


@simulation_bp.route("/resume", methods=["POST"])
def resume_simulation():
    """Resume a paused simulation."""
    result = simulation_engine.resume()
    status_code = 400 if "error" in result else 200
    return jsonify(result), status_code


@simulation_bp.route("/stop", methods=["POST"])
def stop_simulation():
    """Stop the active simulation."""
    result = simulation_engine.stop()
    status_code = 400 if "error" in result else 200
    return jsonify(result), status_code


@simulation_bp.route("/reset", methods=["POST"])
def reset_simulation():
    """Reset simulation environment and digital twin states to clean."""
    result = simulation_engine.reset()
    return jsonify(result), 200


@simulation_bp.route("/history", methods=["GET"])
def get_simulation_history():
    """Fetch past simulation runs from the database."""
    history = simulation_engine.get_history()
    return jsonify({"simulations": history, "total": len(history)}), 200


@simulation_bp.route("/<sim_id>/events", methods=["GET"])
def get_simulation_events(sim_id: str):
    """Fetch the event stream for a specific simulation."""
    events = simulation_engine.get_events(sim_id)
    return jsonify({"simulation_id": sim_id, "events": events, "count": len(events)}), 200


@simulation_bp.route("/intervene", methods=["POST"])
def manual_intervention():
    """Operator manual intervention: ISOLATE, RESTORE, PATCH, HONEYPOT."""
    payload = request.get_json(silent=True) or {}
    action = payload.get("action", "")
    target_node = payload.get("target_node", "")
    notes = payload.get("notes", "")
    result = simulation_engine.intervene(action, target_node, notes)
    status_code = 400 if "error" in result else 200
    return jsonify(result), status_code


@simulation_bp.route("/step", methods=["POST"])
def step_simulation():
    """Trigger step forward in manual step mode or while paused."""
    result = simulation_engine.step_forward()
    return jsonify(result), 200


@simulation_bp.route("/sdn-flows", methods=["GET"])
def get_sdn_flows():
    """Fetch live SDN OpenFlow rules managed by the controller."""
    flows = simulation_engine.get_sdn_flows()
    return jsonify({"flows": flows, "count": len(flows)}), 200


@simulation_bp.route("/export", methods=["GET"])
def export_simulation_report():
    """Generate and export a comprehensive forensic audit report."""
    status = simulation_engine.get_status()
    events = simulation_engine.get_events()
    flows = simulation_engine.get_sdn_flows()
    report = {
        "framework": "ANCDSF — AI-Powered Cyber Defence Simulation Framework",
        "exported_at": time.time(),
        "status": status,
        "sdn_flow_rules": flows,
        "event_timeline": events,
        "mitre_alignment": {
            "tactics": [
                "Reconnaissance", "Initial Access", "Execution",
                "Persistence", "Privilege Escalation", "Defense Evasion",
                "Lateral Movement", "Exfiltration", "Impact"
            ],
            "red_techniques_deployed": len(set(
                e.get("mitre_technique_id") for e in events if e.get("mitre_technique_id")
            )),
        }
    }
    return jsonify(report), 200


@simulation_bp.route("/scenarios", methods=["GET"])
def get_scenarios_meta():
    """Return available attack scenarios, kill chain stages, and SOAR playbooks."""
    scenarios_list = []
    descriptions = {
        "APT": "6-Stage Advanced Persistent Threat campaign targeting critical finance and SCADA sectors with stealth evasion.",
        "Ransomware": "High-velocity double extortion ransomware targeting healthcare and enterprise shares.",
        "DDoS": "Multi-vector volumetric and application layer DDoS targeting edge gateways and backbone links.",
        "Insider": "Privileged insider threat abusing access tokens to exfiltrate proprietary data.",
    }
    sectors_map = {
        "APT": ["finance", "scada", "government"],
        "Ransomware": ["healthcare", "enterprise"],
        "DDoS": ["backbone", "edge"],
        "Insider": ["finance", "enterprise"],
    }

    for scenario_name in RED_TECHNIQUES.keys():
        cfg = get_scenario_config(scenario_name)
        scenarios_list.append({
            "key": scenario_name,
            "name": scenario_name,
            "description": descriptions.get(scenario_name, f"{scenario_name} threat scenario"),
            "target_sectors": sectors_map.get(scenario_name, ["enterprise"]),
            "stages_count": len(cfg.get("kill_chain", [])),
            "playbook_steps": cfg.get("playbook", []),
        })

    playbooks_list = [
        {
            "scenario": k,
            "steps": v,
        }
        for k, v in SOAR_PLAYBOOKS.items()
    ]

    return jsonify({
        "scenarios": scenarios_list,
        "kill_chain_stages": KILL_CHAIN_STAGES,
        "blue_actions": BLUE_ACTIONS,
        "playbooks": playbooks_list,
    }), 200


@simulation_bp.route("/topology", methods=["GET"])
def get_simulation_topology():
    """Return nodes and edges loaded by the simulation engine."""
    return jsonify({
        "nodes": simulation_engine._topology_nodes,
        "edges": simulation_engine._topology_edges,
        "node_states": simulation_engine._node_states,
    }), 200


# ---------------------------------------------------------------------------
# Real-Time SSE Stream Endpoint
# ---------------------------------------------------------------------------

@simulation_bp.route("/stream", methods=["GET"])
@simulation_bp.route("/events", methods=["GET"])
def simulation_events_stream():
    """
    Server-Sent Events (SSE) stream for real-time battle events.
    Frontend connects with new EventSource('/api/simulation/stream')
    """
    event_queue: queue.Queue = queue.Queue(maxsize=500)

    def listener(event: dict):
        try:
            event_queue.put_nowait(event)
        except queue.Full:
            try:
                event_queue.get_nowait()
                event_queue.put_nowait(event)
            except Exception:
                pass

    # Register listener
    simulation_engine.add_listener(listener)

    def event_stream():
        # First send initial status packet
        initial_status = simulation_engine.get_status()
        initial_event = {
            "type": "init",
            "status": initial_status,
            "timestamp": time.time(),
        }
        yield f"data: {json.dumps(initial_event)}\n\n"

        try:
            while True:
                try:
                    # Timeout every 5 seconds to send keepalive
                    event = event_queue.get(timeout=5.0)
                    yield f"data: {json.dumps(event, default=str)}\n\n"
                except queue.Empty:
                    # Keepalive ping
                    yield f": keepalive {time.time()}\n\n"
        except GeneratorExit:
            logger.debug("SSE client disconnected from simulation stream")
        finally:
            simulation_engine.remove_listener(listener)

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
