"""
ACDSF — Simulation Engine
============================
Core engine that runs Red vs Blue agent battles round by round.
Each round: Red action → Environment update → Blue detection → Blue action → Rewards.
Emits structured events for real-time visualization via WebSocket.
"""

import json
import logging
import random
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from database import get_db
from simulation.red_agent import RedAgent
from simulation.blue_agent import BlueAgent
from simulation.scenarios import (
    KILL_CHAIN_STAGES,
    get_scenario_config,
    select_red_technique,
    SOAR_PLAYBOOKS,
)

logger = logging.getLogger("acdsf.simulation.engine")

# Debug flag
DEBUG_SIMULATION = True

CVE_CATALOG = [
    {"cve": "CVE-2023-38606", "port": 445, "service": "Microsoft-DS SMBv3", "vuln": "Kernel Memory Corruption / Remote Code Execution"},
    {"cve": "CVE-2024-21413", "port": 25, "service": "SMTP / Exchange Moniker", "vuln": "Moniker Link Remote Code Execution via NetNTLM leak"},
    {"cve": "CVE-2021-44228", "port": 8080, "service": "Apache Log4j2 JNDI", "vuln": "JNDI LDAP/RMI Injection Arbitrary Class Execution"},
    {"cve": "CVE-2023-22515", "port": 80, "service": "Confluence Web App", "vuln": "Broken Access Control Privilege Escalation"},
    {"cve": "CVE-2024-3400", "port": 443, "service": "GlobalProtect Gateway", "vuln": "Command Injection Edge Firewall Bypass"},
    {"cve": "CVE-2022-26134", "port": 8443, "service": "Java OGNL Container", "vuln": "OGNL Injection Arbitrary Code Execution"},
    {"cve": "CVE-2023-4966", "port": 443, "service": "Citrix NetScaler Gateway", "vuln": "Citrix Bleed Buffer Over-read / Session Hijack"},
    {"cve": "CVE-2024-1709", "port": 8040, "service": "ScreenConnect Server", "vuln": "Authentication Bypass to Initial Admin Creation"},
    {"cve": "CVE-2022-30190", "port": 139, "service": "Follina MSDT", "vuln": "MSDT URL Protocol Code Execution via Diagnostic Tool"},
    {"cve": "CVE-2023-36884", "port": 445, "service": "Office Search Handler", "vuln": "Office and Windows HTML RCE via Specially Crafted Document"},
]


class SimulationEngine:
    """
    Manages the full simulation lifecycle:
    - Start, pause, resume, stop, reset
    - Round-by-round Red vs Blue execution
    - Event emission to registered listeners
    - State persistence to SQLite
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._simulation_id: Optional[str] = None
        self._status = "idle"  # idle | running | paused | completed
        self._current_round = 0
        self._total_rounds = 10
        self._speed = 1.0
        self._scenario = "APT"
        self._target_sector = ""
        self._red_difficulty = "medium"
        self._blue_mode = "autonomous"

        self._red_agent: Optional[RedAgent] = None
        self._blue_agent: Optional[BlueAgent] = None

        self._thread: Optional[threading.Thread] = None
        self._pause_event = threading.Event()
        self._stop_event = threading.Event()
        self._pause_event.set()  # Not paused initially

        self._manual_step_mode = False
        self._step_trigger = threading.Event()
        self._current_phase = 0
        self._current_phase_title = "Standby"
        self._sdn_flows: list[dict] = []

        self._events: list[dict] = []
        self._node_states: dict[str, str] = {}  # node_id → state
        self._listeners: list[Callable] = []
        self._topology_nodes: list[dict] = []
        self._topology_edges: list[dict] = []

        self._start_time: Optional[datetime] = None
        self._round_results: list[dict] = []

        # Load topology
        self._load_topology()

    def _load_topology(self):
        """Load the 43-node topology from topology.json."""
        import os
        topo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "topology.json")
        try:
            with open(topo_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._topology_nodes = data.get("nodes", [])
            self._topology_edges = data.get("edges", data.get("links", []))
            # Initialize all nodes as healthy
            for node in self._topology_nodes:
                nid = node.get("id", "")
                self._node_states[nid] = "healthy"
            logger.info("Topology loaded: %d nodes, %d edges",
                        len(self._topology_nodes), len(self._topology_edges))
        except Exception:
            logger.exception("Failed to load topology for simulation")

    def add_listener(self, callback: Callable):
        """Register a WebSocket/SSE listener for events."""
        with self._lock:
            if callback not in self._listeners:
                self._listeners.append(callback)

    def remove_listener(self, callback: Callable):
        with self._lock:
            if callback in self._listeners:
                self._listeners.remove(callback)

    def _emit(self, event: dict):
        """Broadcast event to all listeners and store in history."""
        with self._lock:
            self._events.append(event)
            dead = []
            for cb in self._listeners:
                try:
                    cb(event)
                except Exception:
                    dead.append(cb)
            for cb in dead:
                self._listeners.remove(cb)

        if DEBUG_SIMULATION:
            logger.debug("SIM EVENT: %s", json.dumps(event, default=str)[:200])

    # -----------------------------------------------------------------------
    # Lifecycle controls
    # -----------------------------------------------------------------------
    def start(self, config: dict) -> dict:
        """Start a new simulation."""
        with self._lock:
            if self._status == "running":
                return {"error": "Simulation already running"}

            self._simulation_id = f"SIM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
            self._status = "running"
            self._current_round = 0
            self._total_rounds = min(100, max(1, config.get("rounds", 10)))
            self._speed = max(0.25, min(10.0, config.get("speed", 1.0)))
            self._scenario = config.get("scenario", "APT")
            self._target_sector = config.get("target_sector", "")
            self._red_difficulty = config.get("red_difficulty", "medium")
            self._blue_mode = config.get("blue_mode", "autonomous")
            self._user_email = (config.get("user_email") or config.get("recipient") or config.get("email") or "").strip()

            self._events = []
            self._round_results = []
            self._start_time = datetime.now(timezone.utc)

            # Reset node states
            for node in self._topology_nodes:
                self._node_states[node.get("id", "")] = "healthy"

            # Initialize agents
            self._red_agent = RedAgent(
                scenario=self._scenario,
                difficulty=self._red_difficulty,
                target_sector=self._target_sector,
            )
            self._blue_agent = BlueAgent(mode=self._blue_mode)

            # Reset threading events
            self._stop_event.clear()
            self._pause_event.set()

            # Persist to DB
            self._persist_simulation_start()

            # Start background thread
            self._thread = threading.Thread(
                target=self._run_loop,
                name=f"Sim-{self._simulation_id}",
                daemon=True,
            )
            self._thread.start()

            # Fire real-time notification across Email (if recipient provided) and Dashboard SSE
            try:
                from api.notification_engine import notify
                notify(
                    type="ATTACK_LAUNCHED",
                    severity="high",
                    title=f"Simulation Launched: {self._scenario}",
                    message=f"Red vs Blue cyber warfare simulation {self._simulation_id} launched ({self._scenario} scenario, {self._total_rounds} rounds, {self._speed}x speed). Red Team initiating Kill Chain.",
                    attack_id=self._simulation_id,
                    target_node=self._target_sector or "SOVEREIGN-FABRIC",
                    recipient_email=self._user_email or None,
                    extra_data={
                        "scenario": self._scenario,
                        "rounds": self._total_rounds,
                        "speed": self._speed,
                        "difficulty": self._red_difficulty,
                        "blue_mode": self._blue_mode,
                    },
                )
            except Exception as exc:
                logger.warning("Failed to fire simulation start notification: %s", exc)

            logger.info("Simulation %s started: scenario=%s rounds=%d speed=%.1fx",
                        self._simulation_id, self._scenario, self._total_rounds, self._speed)

            return {
                "simulation_id": self._simulation_id,
                "status": "running",
                "scenario": self._scenario,
                "rounds": self._total_rounds,
                "speed": self._speed,
            }

    def pause(self) -> dict:
        with self._lock:
            if self._status != "running":
                return {"error": "Not running"}
            self._status = "paused"
            self._pause_event.clear()
            self._emit(self._make_system_event("PAUSED", "Simulation paused by operator"))
            return {"status": "paused"}

    def resume(self) -> dict:
        with self._lock:
            if self._status != "paused":
                return {"error": "Not paused"}
            self._status = "running"
            self._pause_event.set()
            self._emit(self._make_system_event("RESUMED", "Simulation resumed"))
            return {"status": "running"}

    def stop(self) -> dict:
        with self._lock:
            if self._status not in ("running", "paused"):
                return {"error": "Not active"}
            self._stop_event.set()
            self._pause_event.set()  # Unblock if paused
            self._status = "completed"
            self._emit(self._make_system_event("STOPPED", "Simulation stopped by operator"))
            return {"status": "completed"}

    def reset(self) -> dict:
        """Reset everything to idle state."""
        self.stop()
        time.sleep(0.2)  # Let thread finish
        with self._lock:
            self._status = "idle"
            self._simulation_id = None
            self._current_round = 0
            self._events = []
            self._round_results = []
            self._red_agent = None
            self._blue_agent = None
            for node in self._topology_nodes:
                self._node_states[node.get("id", "")] = "healthy"
        # Reset digital twin states
        try:
            from digital_twin.service import mutate_asset_state
            for node in self._topology_nodes:
                nid = node.get("id", "")
                mutate_asset_state(nid, cpu_load=random.uniform(5, 20), is_compromised=0)
        except Exception:
            pass
        return {"status": "idle", "message": "Simulation reset to clean state"}

    def get_status(self) -> dict:
        elapsed = 0
        if self._start_time:
            elapsed = round((datetime.now(timezone.utc) - self._start_time).total_seconds(), 1)

        return {
            "simulation_id": self._simulation_id,
            "status": self._status,
            "current_round": self._current_round,
            "total_rounds": self._total_rounds,
            "scenario": self._scenario,
            "speed": self._speed,
            "elapsed_seconds": elapsed,
            "current_phase": self._current_phase,
            "current_phase_title": self._current_phase_title,
            "manual_step_mode": self._manual_step_mode,
            "sdn_flows": list(self._sdn_flows[:20]),
            "red_state": self._red_agent.get_state() if self._red_agent else None,
            "blue_state": self._blue_agent.get_state() if self._blue_agent else None,
            "node_states": dict(self._node_states),
            "round_results": self._round_results,
        }

    def get_sdn_flows(self) -> list[dict]:
        with self._lock:
            return list(self._sdn_flows)

    def intervene(self, action: str, node_id: str, notes: str = "") -> dict:
        """Operator manual intervention: ISOLATE, RESTORE, PATCH, HONEYPOT."""
        with self._lock:
            if node_id not in self._node_states:
                return {"error": f"Node {node_id} not found in topology"}

            prev_state = self._node_states[node_id]
            aid = action.upper()
            if aid in ("ISOLATE", "BLOCK"):
                self._node_states[node_id] = "blocked"
                self._sdn_isolate(node_id)
                self._record_flow_rule(node_id, "DROP", priority=65000)
                msg = f"OPERATOR OVERRIDE: Manually isolated node {node_id} via SDN OpenFlow DROP rule."
            elif aid in ("RESTORE", "UNBLOCK"):
                self._node_states[node_id] = "restored"
                self._sdn_restore(node_id)
                self._record_flow_rule(node_id, "FORWARD", priority=30000)
                msg = f"OPERATOR OVERRIDE: Restored node {node_id} connectivity."
            elif aid == "PATCH":
                self._node_states[node_id] = "patched"
                if self._red_agent and node_id in self._red_agent.compromised_nodes:
                    self._red_agent.compromised_nodes.remove(node_id)
                msg = f"OPERATOR OVERRIDE: Emergency zero-day security patch deployed on {node_id}."
            elif aid == "HONEYPOT":
                self._node_states[node_id] = "honeypot"
                self._record_flow_rule(node_id, "REDIRECT_HONEYPOT", priority=55000)
                msg = f"OPERATOR OVERRIDE: Deployed honeypot decoy listener on {node_id}."
            else:
                return {"error": f"Unknown intervention action: {action}"}

            event = self._make_event(
                self._current_round, 4, "BLUE", f"OPERATOR_{aid}",
                target_node=node_id,
                success=True,
                message=msg,
                explanation=notes or f"Manual operator intervention: {aid} on {node_id}",
                node_state_changes={node_id: self._node_states[node_id]}
            )
            self._emit(event)
            return {
                "success": True,
                "node_id": node_id,
                "previous_state": prev_state,
                "new_state": self._node_states[node_id],
                "action": aid,
                "message": msg
            }

    def step_forward(self) -> dict:
        """Advance one step when in manual stepping mode or paused."""
        with self._lock:
            self._step_trigger.set()
            return {"status": "stepped", "current_round": self._current_round, "phase": self._current_phase}

    def _record_flow_rule(self, node_id: str, action: str, priority: int = 50000) -> dict:
        switch_id = "NBR-01"
        for edge in self._topology_edges:
            if edge.get("target") == node_id and "SW" in edge.get("source", ""):
                switch_id = edge.get("source")
                break
            elif edge.get("source") == node_id and "SW" in edge.get("target", ""):
                switch_id = edge.get("target")
                break
        flow = {
            "flow_id": f"OF-RULE-{len(self._sdn_flows) + 101}",
            "switch_id": switch_id,
            "target_node": node_id,
            "priority": priority,
            "match": f"dl_type=0x0800, nw_dst={node_id}.acdsf.local",
            "action": action,
            "packet_count": random.randint(120, 850),
            "byte_count": random.randint(14500, 92000),
            "installed_at": datetime.now(timezone.utc).strftime("%H:%M:%S")
        }
        self._sdn_flows.insert(0, flow)
        if len(self._sdn_flows) > 50:
            self._sdn_flows = self._sdn_flows[:50]
        return flow

    def get_events(self, sim_id: str = None) -> list[dict]:
        """Get full event history (for current or stored simulation)."""
        if sim_id and sim_id != self._simulation_id:
            # Load from DB
            return self._load_events_from_db(sim_id)
        return list(self._events)

    def get_history(self) -> list[dict]:
        """List past simulations."""
        try:
            with get_db() as conn:
                rows = conn.execute(
                    "SELECT * FROM simulations ORDER BY started_at DESC LIMIT 50"
                ).fetchall()
                return [dict(r) for r in rows]
        except Exception:
            logger.exception("Failed to load simulation history")
            return []

    # -----------------------------------------------------------------------
    # Main simulation loop (runs in background thread)
    # -----------------------------------------------------------------------
    def _run_loop(self):
        """Execute the red vs blue battle round by round."""
        sim_id = self._simulation_id
        logger.info("[%s] Simulation loop started", sim_id)

        # Emit start event
        self._emit(self._make_system_event(
            "STARTED",
            f"Simulation {sim_id} started: {self._scenario} scenario, "
            f"{self._total_rounds} rounds, speed {self._speed}x",
        ))

        try:
            for round_num in range(1, self._total_rounds + 1):
                # Check stop
                if self._stop_event.is_set():
                    break

                # Wait if paused
                self._pause_event.wait()
                if self._stop_event.is_set():
                    break

                self._current_round = round_num
                self._execute_round(round_num)

                # Delay between rounds for watchability
                base_delay = 2.0  # seconds
                actual_delay = base_delay / max(0.25, self._speed)
                # Sleep in small increments to check for stop
                for _ in range(int(actual_delay * 10)):
                    if self._stop_event.is_set():
                        break
                    time.sleep(0.1)

        except Exception:
            logger.exception("[%s] Simulation loop crashed", sim_id)
        finally:
            with self._lock:
                if self._status != "completed":
                    self._status = "completed"

            # Emit completion
            self._emit(self._make_completion_event())

            # Persist results
            self._persist_simulation_end()

            # Send notification
            self._send_notification()

            logger.info("[%s] Simulation loop ended", sim_id)

    def _execute_round(self, round_num: int):
        """Execute a single round: Red → Env → Blue Detect → Blue Act → Rewards."""
        sim_id = self._simulation_id
        step = 0

        # --- Advance red stage every N rounds ---
        rounds_per_stage = max(1, self._total_rounds // 6)
        if round_num > 1 and (round_num - 1) % rounds_per_stage == 0:
            self._red_agent.advance_stage()
            self._emit(self._make_event(
                round_num, step, "RED", "STAGE_ADVANCE",
                step_phase=1,
                step_phase_title="Adversary Kill Chain Advancement",
                mitre_tactic=KILL_CHAIN_STAGES[min(self._red_agent.current_stage - 1, 5)]["mitre_tactic"],
                message=f"Adversary Kill Chain escalated to Stage {self._red_agent.current_stage}: "
                        f"{self._red_agent._get_stage_name()}",
            ))
            self._step_delay()

        # Pick matching CVE & service forensic details for this round
        cve_info = CVE_CATALOG[(round_num - 1) % len(CVE_CATALOG)]

        # ── STEP 1: RED ACTION ──
        step = 1
        self._current_phase = 1
        self._current_phase_title = "Phase 1: Adversary Kill Chain Action (DQN Target & Technique)"
        technique = select_red_technique(self._scenario, self._red_agent.current_stage)
        target_node = self._red_agent.select_target(self._topology_nodes, self._topology_edges)
        target_id = target_node.get("id", "")

        red_result = self._red_agent.execute_action(
            technique, target_node, self._node_states
        )

        # Update node state
        if red_result["success"]:
            if self._node_states.get(target_id) not in ("blocked", "isolated"):
                if self._red_agent.current_stage <= 1:
                    self._node_states[target_id] = "scanned"
                elif self._red_agent.current_stage <= 3:
                    self._node_states[target_id] = "under_attack"
                else:
                    self._node_states[target_id] = "compromised"

        synthetic_payload = (
            f"0x{bytes(technique['name'][:8], 'utf-8').hex()}"
            f"_CVE_{cve_info['cve'].replace('-', '_')}"
            f"_PAYLOAD_NOP_SLED_0x90909090"
        )

        # Top candidate Q-values evaluated by DQN
        q_summary = {
            target_id: round(self._red_agent.q_values.get(target_id, 0.72), 3)
        }
        for k, v in list(self._red_agent.q_values.items())[:4]:
            q_summary[k] = round(v, 3)

        self._emit(self._make_event(
            round_num, step, "RED", technique["name"],
            step_phase=1,
            step_phase_title="Phase 1: Adversary Kill Chain Action",
            mitre_tactic=KILL_CHAIN_STAGES[min(self._red_agent.current_stage - 1, 5)]["mitre_tactic"],
            mitre_technique_id=technique["id"],
            source_node=self._get_attack_source(target_id),
            target_node=target_id,
            success=red_result["success"],
            reward_red=red_result["reward"],
            detection_confidence=red_result["confidence"],
            cve_id=cve_info["cve"],
            target_port=cve_info["port"],
            target_service=cve_info["service"],
            exploit_payload=synthetic_payload,
            q_values=q_summary,
            explanation=red_result["explanation"],
            message=f"Red Team: {technique['name']} ({technique['id']}) → {target_id} "
                    f"[{cve_info['cve']} on port {cve_info['port']}/{cve_info['service']}] "
                    f"{'✓ EXPLOIT SUCCEEDED' if red_result['success'] else '✗ ATTACK MITIGATED'}",
            node_state_changes={target_id: self._node_states.get(target_id, "healthy")},
        ))
        self._step_delay()

        # ── STEP 2: ENV UPDATE ──
        step = 2
        self._current_phase = 2
        self._current_phase_title = "Phase 2: Digital Twin Telemetry Ingestion (Node State Mutation)"
        self._update_digital_twin(target_id, red_result["success"])
        curr_state = self._node_states.get(target_id, "healthy")
        cpu_val = random.uniform(82, 98) if red_result["success"] else random.uniform(28, 55)
        mem_val = random.uniform(74, 91) if red_result["success"] else random.uniform(32, 60)

        self._emit(self._make_event(
            round_num, step, "ENV", "Environment Update",
            step_phase=2,
            step_phase_title="Phase 2: Digital Twin Telemetry Ingestion",
            target_node=target_id,
            cve_id=cve_info["cve"],
            target_port=cve_info["port"],
            target_service=cve_info["service"],
            message=f"Digital Twin: Asset {target_id} state transitioned to '{curr_state}'. "
                    f"Telemetry: CPU={cpu_val:.1f}%, RAM={mem_val:.1f}%, Ingress Flow={random.randint(450, 1800)} pps.",
            explanation=f"Telemetry sensor ingested anomalous packet surge on port {cve_info['port']} "
                        f"targeting {cve_info['service']}. Asset vulnerability {cve_info['cve']} triggered metric shift.",
            node_state_changes=dict(self._node_states),
        ))
        self._step_delay()

        # ── STEP 3: BLUE DETECTION ──
        step = 3
        self._current_phase = 3
        self._current_phase_title = "Phase 3: Hybrid AI Anomaly Detection (GNN & LSTM Scoring)"
        detection = self._blue_agent.detect_anomaly(
            {
                "success": red_result["success"],
                "technique_stealth": technique.get("stealth", 0.5),
                "target_node": target_id,
            },
            self._node_states,
        )

        self._emit(self._make_event(
            round_num, step, "BLUE", "Anomaly Detection",
            step_phase=3,
            step_phase_title="Phase 3: Hybrid AI Anomaly Detection",
            target_node=target_id,
            detection_confidence=detection["confidence"],
            success=detection["detected"],
            gnn_score=detection["gnn_score"],
            lstm_score=detection["lstm_score"],
            anomaly_score=detection["anomaly_score"],
            threshold=detection["threshold"],
            cve_id=cve_info["cve"],
            message=f"Detection Pipeline: {'🔔 ANOMALY VERIFIED' if detection['detected'] else '— No Anomaly Triggered'} "
                    f"(GNN Graph: {detection['gnn_score']:.2f}, LSTM Temporal: {detection['lstm_score']:.2f}, "
                    f"Combined: {detection['anomaly_score']:.2f} vs Threshold: {detection['threshold']:.2f})",
            explanation=f"Graph Convolutional Network (GNN) analyzed topological edge flow changes. "
                        f"Bidirectional LSTM evaluated time-series packet telemetry. "
                        f"Combined score {detection['anomaly_score']:.3f} "
                        f"{'exceeded' if detection['detected'] else 'remained below'} anomaly threshold ({detection['threshold']:.3f}).",
        ))

        # Real-time multi-channel notification dispatch when anomaly detected
        if detection.get("detected"):
            try:
                from api.notification_engine import notify
                notify(
                    type="ATTACK_DETECTED",
                    severity="critical" if red_result["success"] else "high",
                    title=f"Attack Detected: {technique['name']}",
                    message=f"Hybrid AI detection engine identified {technique['name']} on {target_id} (Round {round_num}). Confidence: {round(detection['confidence'] * 100, 1)}%.",
                    attack_id=f"{sim_id}-R{round_num}",
                    mitre_technique_id=technique["id"],
                    source_node=self._get_attack_source(target_id),
                    target_node=target_id,
                    extra_data={
                        "confidence": round(detection["confidence"] * 100, 1),
                        "risk_score": int(min(1.0, detection["anomaly_score"]) * 100),
                        "source_ip": f"10.0.{(round_num % 5) + 1}.{(round_num * 7) % 200 + 10}",
                        "mitre_technique_name": technique["name"],
                    },
                )
            except Exception as exc:
                logger.warning("Failed to fire round detection notification: %s", exc)

        self._step_delay()

        # ── STEP 4: BLUE ACTION ──
        step = 4
        self._current_phase = 4
        self._current_phase_title = "Phase 4: Autonomous SOC Defense (SDN Controller & SOAR Playbook)"
        blue_action = self._blue_agent.select_action(
            detection, target_id, self._node_states,
            self._red_agent.compromised_nodes,
        )

        blue_exec = self._blue_agent.execute_action(blue_action, self._node_states)
        installed_flow = None

        # Update node state based on blue action
        if blue_action["action_id"] == "BLOCK" and blue_exec["success"]:
            self._node_states[target_id] = "blocked"
            self._sdn_isolate(target_id)
            installed_flow = self._record_flow_rule(target_id, "DROP", priority=60000)
        elif blue_action["action_id"] == "RESTORE" and blue_exec["success"]:
            self._node_states[target_id] = "restored"
            self._sdn_restore(target_id)
            installed_flow = self._record_flow_rule(target_id, "FORWARD", priority=30000)
        elif blue_action["action_id"] == "HONEYPOT" and blue_exec["success"]:
            self._node_states[target_id] = "honeypot"
            installed_flow = self._record_flow_rule(target_id, "REDIRECT_HONEYPOT", priority=55000)
        elif blue_action["action_id"] == "PATCH" and blue_exec["success"]:
            if self._node_states.get(target_id) not in ("compromised",):
                self._node_states[target_id] = "healthy"

        self._emit(self._make_event(
            round_num, step, "BLUE", blue_action.get("name", "Defense"),
            step_phase=4,
            step_phase_title="Phase 4: Autonomous SOC Defense",
            target_node=target_id,
            success=blue_exec["success"],
            reward_blue=blue_exec["reward"],
            sdn_rule=installed_flow,
            message=f"Blue Team Response: {blue_action.get('name', 'Action')} on {target_id} — "
                    f"{'✓ Playbook Executed' if blue_exec['success'] else '✗ Playbook Denied'} "
                    f"(DQN Q-value: {blue_action.get('q_value', 0):.3f})",
            explanation=f"SOAR Orchestrator dispatched policy '{blue_action.get('action_id')}'. "
                        f"{'OpenFlow rule pushed to switch: ' + installed_flow['flow_id'] if installed_flow else ''}",
            node_state_changes={target_id: self._node_states.get(target_id, "healthy")},
        ))
        self._step_delay()

        # ── STEP 5: ROUND SUMMARY ──
        step = 5
        self._current_phase = 5
        self._current_phase_title = "Phase 5: RL Q-Learning State Update & Scoring"
        round_winner = "BLUE" if (detection["detected"] and blue_exec["success"]) else "RED"
        if not red_result["success"]:
            round_winner = "BLUE"

        round_result = {
            "round": round_num,
            "winner": round_winner,
            "red_reward": red_result["reward"],
            "blue_reward": blue_exec["reward"],
            "red_technique": technique["id"],
            "blue_action": blue_action["action_id"],
            "target": target_id,
            "detected": detection["detected"],
            "red_success": red_result["success"],
            "cve": cve_info["cve"],
        }
        self._round_results.append(round_result)

        self._emit(self._make_event(
            round_num, step, "ENV", "Round Summary",
            step_phase=5,
            step_phase_title="Phase 5: RL Q-Learning State Update",
            message=f"Round {round_num}/{self._total_rounds} Complete — Victor: {round_winner} TEAM. "
                    f"Red Reward: {red_result['reward']:+.2f} | Blue Reward: {blue_exec['reward']:+.2f}",
            explanation=f"Reinforcement learning weights updated via Bellman equation. "
                        f"Cumulative Red Reward: {self._red_agent.cumulative_reward:+.2f}, "
                        f"Cumulative Blue Reward: {self._blue_agent.cumulative_reward:+.2f}.",
            reward_red=red_result["reward"],
            reward_blue=blue_exec["reward"],
        ))

        # Persist round to DB
        self._persist_round_event(round_num, round_result)

    def _step_delay(self):
        """Delay between steps for watchability or manual pause."""
        if self._manual_step_mode:
            # Wait until operator clicks "Step Forward"
            self._step_trigger.wait()
            self._step_trigger.clear()
            return

        base_delay = 1.4  # clear, watchable pace
        actual_delay = base_delay / max(0.25, self._speed)
        steps = int(actual_delay * 10)
        for _ in range(max(1, steps)):
            if self._stop_event.is_set():
                return
            self._pause_event.wait()
            time.sleep(0.1)

    # -----------------------------------------------------------------------
    # Helper methods
    # -----------------------------------------------------------------------
    def _get_attack_source(self, target_id: str) -> str:
        """Find a plausible source node for the attack (adjacent compromised or NBR-01)."""
        if self._red_agent and self._red_agent.compromised_nodes:
            for edge in self._topology_edges:
                src = edge.get("source", "")
                tgt = edge.get("target", "")
                if tgt == target_id and src in self._red_agent.compromised_nodes:
                    return src
                if src == target_id and tgt in self._red_agent.compromised_nodes:
                    return tgt
        return "NBR-01"  # External attacker entry point

    def _update_digital_twin(self, node_id: str, attack_success: bool):
        """Update digital twin state in DB."""
        try:
            from digital_twin.service import mutate_asset_state
            if attack_success:
                mutate_asset_state(node_id, cpu_load=random.uniform(75, 96),
                                   is_compromised=1, alert_increment=1)
            else:
                mutate_asset_state(node_id, cpu_load=random.uniform(30, 55),
                                   alert_increment=1)
        except Exception:
            logger.debug("Digital twin update skipped for %s", node_id)

    def _sdn_isolate(self, node_id: str):
        """Isolate node via SDN controller."""
        try:
            from digital_twin.sdn import isolate_host
            isolate_host(node_id)
        except Exception:
            logger.debug("SDN isolate skipped for %s", node_id)

    def _sdn_restore(self, node_id: str):
        """Restore node via SDN controller."""
        try:
            from digital_twin.sdn import restore_host
            restore_host(node_id)
        except Exception:
            logger.debug("SDN restore skipped for %s", node_id)

    def _make_event(self, round_num: int, step: int, actor: str, action: str,
                    **kwargs) -> dict:
        """Create a structured simulation event."""
        event = {
            "type": "simulation_event",
            "simulation_id": self._simulation_id,
            "round": round_num,
            "step": step,
            "step_phase": kwargs.get("step_phase", step),
            "step_phase_title": kwargs.get("step_phase_title", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "action": action,
            "mitre_tactic": kwargs.get("mitre_tactic", ""),
            "mitre_technique_id": kwargs.get("mitre_technique_id", ""),
            "source_node": kwargs.get("source_node", ""),
            "target_node": kwargs.get("target_node", ""),
            "node_state_changes": kwargs.get("node_state_changes", {}),
            "reward_red": kwargs.get("reward_red", 0),
            "reward_blue": kwargs.get("reward_blue", 0),
            "detection_confidence": kwargs.get("detection_confidence", 0),
            "success": kwargs.get("success", None),
            "explanation": kwargs.get("explanation", ""),
            "message": kwargs.get("message", ""),
            "cve_id": kwargs.get("cve_id", ""),
            "target_port": kwargs.get("target_port", None),
            "target_service": kwargs.get("target_service", ""),
            "exploit_payload": kwargs.get("exploit_payload", ""),
            "gnn_score": kwargs.get("gnn_score", None),
            "lstm_score": kwargs.get("lstm_score", None),
            "anomaly_score": kwargs.get("anomaly_score", None),
            "threshold": kwargs.get("threshold", None),
            "sdn_rule": kwargs.get("sdn_rule", None),
            "q_values": kwargs.get("q_values", {}),
            # Include full agent states for dashboard
            "red_state": self._red_agent.get_state() if self._red_agent else None,
            "blue_state": self._blue_agent.get_state() if self._blue_agent else None,
            "sdn_flows": list(self._sdn_flows[:10]),
        }
        return event

    def _make_system_event(self, action: str, message: str) -> dict:
        return {
            "type": "simulation_system",
            "simulation_id": self._simulation_id,
            "round": self._current_round,
            "step": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor": "SYSTEM",
            "action": action,
            "message": message,
            "status": self._status,
            "red_state": self._red_agent.get_state() if self._red_agent else None,
            "blue_state": self._blue_agent.get_state() if self._blue_agent else None,
        }

    def _make_completion_event(self) -> dict:
        red_wins = sum(1 for r in self._round_results if r["winner"] == "RED")
        blue_wins = sum(1 for r in self._round_results if r["winner"] == "BLUE")
        winner = "RED" if red_wins > blue_wins else "BLUE" if blue_wins > red_wins else "DRAW"

        return {
            "type": "simulation_complete",
            "simulation_id": self._simulation_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "winner": winner,
            "total_rounds": len(self._round_results),
            "red_wins": red_wins,
            "blue_wins": blue_wins,
            "red_state": self._red_agent.get_state() if self._red_agent else None,
            "blue_state": self._blue_agent.get_state() if self._blue_agent else None,
            "round_results": self._round_results,
            "node_states": dict(self._node_states),
            "message": f"Simulation complete! {winner} wins ({red_wins} vs {blue_wins}). "
                       f"{'Red Team achieved ' + str(self._red_agent.current_stage) + '/6 kill chain stages.' if self._red_agent else ''}",
        }

    # -----------------------------------------------------------------------
    # Persistence
    # -----------------------------------------------------------------------
    def _persist_simulation_start(self):
        try:
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO simulations
                       (simulation_id, scenario, total_rounds, speed, target_sector,
                        red_difficulty, blue_mode, status, started_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (self._simulation_id, self._scenario, self._total_rounds,
                     self._speed, self._target_sector, self._red_difficulty,
                     self._blue_mode, "running",
                     datetime.now(timezone.utc).isoformat()),
                )
        except Exception:
            logger.exception("Failed to persist simulation start")

    def _persist_simulation_end(self):
        try:
            red_state = self._red_agent.get_state() if self._red_agent else {}
            blue_state = self._blue_agent.get_state() if self._blue_agent else {}
            red_wins = sum(1 for r in self._round_results if r["winner"] == "RED")
            blue_wins = sum(1 for r in self._round_results if r["winner"] == "BLUE")
            winner = "RED" if red_wins > blue_wins else "BLUE" if blue_wins > red_wins else "DRAW"

            with get_db() as conn:
                conn.execute(
                    """UPDATE simulations SET
                        status=?, ended_at=?, winner=?, red_wins=?, blue_wins=?,
                        red_reward=?, blue_reward=?, stages_completed=?,
                        nodes_compromised=?, detection_rate=?, mttd=?, mttr=?,
                        results_json=?
                       WHERE simulation_id=?""",
                    ("completed", datetime.now(timezone.utc).isoformat(),
                     winner, red_wins, blue_wins,
                     red_state.get("cumulative_reward", 0),
                     blue_state.get("cumulative_reward", 0),
                     red_state.get("stage", 1),
                     red_state.get("compromised_count", 0),
                     blue_state.get("detection_rate", 0),
                     blue_state.get("mttd", 0),
                     blue_state.get("mttr", 0),
                     json.dumps(self._round_results),
                     self._simulation_id),
                )
        except Exception:
            logger.exception("Failed to persist simulation end")

    def _persist_round_event(self, round_num: int, result: dict):
        try:
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO simulation_events
                       (simulation_id, round, winner, red_reward, blue_reward,
                        red_technique, blue_action, target_node, detected, red_success,
                        timestamp)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (self._simulation_id, round_num, result["winner"],
                     result["red_reward"], result["blue_reward"],
                     result["red_technique"], result["blue_action"],
                     result["target"], 1 if result["detected"] else 0,
                     1 if result["red_success"] else 0,
                     datetime.now(timezone.utc).isoformat()),
                )
        except Exception:
            logger.debug("Failed to persist round event for round %d", round_num)

    def _load_events_from_db(self, sim_id: str) -> list[dict]:
        try:
            with get_db() as conn:
                rows = conn.execute(
                    "SELECT * FROM simulation_events WHERE simulation_id=? ORDER BY round",
                    (sim_id,),
                ).fetchall()
                return [dict(r) for r in rows]
        except Exception:
            return []

    def _send_notification(self):
        """Send completion notification via existing notification engine."""
        try:
            from api.notification_engine import notify
            red_state = self._red_agent.get_state() if self._red_agent else {}
            blue_state = self._blue_agent.get_state() if self._blue_agent else {}
            red_wins = sum(1 for r in self._round_results if r["winner"] == "RED")
            blue_wins = sum(1 for r in self._round_results if r["winner"] == "BLUE")
            winner = "RED" if red_wins > blue_wins else "BLUE"

            notify(
                type="ATTACK_SUMMARY",
                severity="info",
                title=f"Simulation Complete — {winner} Team Wins",
                message=f"Simulation {self._simulation_id}: {self._scenario} scenario completed. "
                        f"Score: Red {red_wins} vs Blue {blue_wins}. "
                        f"Detection rate: {blue_state.get('detection_rate', 0)}%. "
                        f"Red reached stage {red_state.get('stage', 1)}/6.",
                attack_id=self._simulation_id,
            )
        except Exception:
            logger.debug("Failed to send simulation notification")


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------
simulation_engine = SimulationEngine()
