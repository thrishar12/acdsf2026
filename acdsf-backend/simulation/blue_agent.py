"""
ACDSF — DQN Blue Team Agent
==============================
Simulates a DQN reinforcement learning blue agent that selects defensive
actions based on anomaly detection scores (GNN/LSTM-inspired) and Q-value
estimates for optimal response.
"""

import logging
import math
import random
from typing import Optional

logger = logging.getLogger("acdsf.simulation.blue_agent")


class BlueAgent:
    """
    DQN-style Blue Team agent with:
    - GNN/LSTM anomaly detection scoring
    - SDN controller integration (block/restore)
    - SOAR playbook execution
    - Q-value-based defensive action selection
    """

    def __init__(self, mode: str = "autonomous"):
        self.mode = mode  # autonomous | guided | passive
        self.cumulative_reward = 0.0
        self.blocked_nodes: list[str] = []
        self.restored_nodes: list[str] = []
        self.protected_count = 0
        self.detection_count = 0
        self.total_detections = 0
        self.false_positives = 0
        self.soar_stage = 0
        self.soar_total = 5
        self.mttd_values: list[float] = []
        self.mttr_values: list[float] = []

        # Detection model state
        self._anomaly_baseline = 0.15
        self._detection_sensitivity = {
            "autonomous": 0.75,
            "guided": 0.60,
            "passive": 0.45,
        }.get(mode, 0.65)

    @property
    def mttd(self) -> float:
        """Mean time to detect (seconds)."""
        if not self.mttd_values:
            return 0.0
        return round(sum(self.mttd_values) / len(self.mttd_values), 2)

    @property
    def mttr(self) -> float:
        """Mean time to respond (seconds)."""
        if not self.mttr_values:
            return 0.0
        return round(sum(self.mttr_values) / len(self.mttr_values), 2)

    @property
    def detection_rate(self) -> float:
        if self.total_detections == 0:
            return 0.0
        return round(self.detection_count / self.total_detections * 100, 1)

    def detect_anomaly(self, red_action: dict, node_states: dict) -> dict:
        """
        Simulate GNN/LSTM anomaly detection on the latest red action.
        Returns detection result with confidence score.
        """
        self.total_detections += 1

        success = red_action.get("success", False)
        technique_stealth = red_action.get("technique_stealth", 0.5)
        target = red_action.get("target_node", "")

        # GNN feature: network structure anomaly
        gnn_score = random.uniform(0.3, 0.9) if success else random.uniform(0.1, 0.5)

        # LSTM feature: temporal traffic anomaly
        lstm_score = random.uniform(0.2, 0.85) if success else random.uniform(0.05, 0.4)

        # Combined anomaly score
        raw_score = (gnn_score * 0.55 + lstm_score * 0.45)

        # Stealth reduces detection
        stealth_penalty = technique_stealth * 0.3
        anomaly_score = max(0, min(1, raw_score - stealth_penalty))

        # Detection threshold based on mode
        threshold = 1.0 - self._detection_sensitivity
        detected = anomaly_score > threshold

        if detected and success:
            self.detection_count += 1
            confidence = round(anomaly_score * 100 + random.uniform(-3, 5), 1)
            # Record MTTD (simulated as 1-5 seconds)
            self.mttd_values.append(round(random.uniform(0.8, 4.5), 2))
        elif detected and not success:
            # False positive
            self.false_positives += 1
            confidence = round(anomaly_score * 80 + random.uniform(-5, 3), 1)
        else:
            confidence = round(anomaly_score * 60, 1)

        return {
            "detected": detected,
            "anomaly_score": round(anomaly_score, 4),
            "gnn_score": round(gnn_score, 4),
            "lstm_score": round(lstm_score, 4),
            "confidence": max(0, min(100, confidence)),
            "threshold": round(threshold, 4),
            "is_true_positive": detected and success,
            "is_false_positive": detected and not success,
        }

    def select_action(self, detection: dict, target_node: str,
                      node_states: dict, compromised_nodes: list[str]) -> dict:
        """
        Select defensive action using DQN-style Q-value estimation.
        """
        detected = detection.get("detected", False)
        anomaly_score = detection.get("anomaly_score", 0)

        if not detected:
            return {
                "action_id": "MONITOR",
                "name": "Enhanced Monitoring",
                "description": "No anomaly detected — maintaining surveillance",
                "target_node": target_node,
                "q_value": 0.1,
            }

        # Calculate Q-values for each action
        actions_q = []
        for action in self._get_available_actions(target_node, node_states):
            q = self._estimate_defensive_q(action, anomaly_score, target_node,
                                           node_states, compromised_nodes)
            actions_q.append((action, q))

        # Select best action (greedy — blue team is always trying to optimize)
        if self.mode == "autonomous":
            actions_q.sort(key=lambda x: x[1], reverse=True)
            best_action, best_q = actions_q[0]
        elif self.mode == "guided":
            # Weighted random among top 3
            top3 = sorted(actions_q, key=lambda x: x[1], reverse=True)[:3]
            weights = [max(0.1, q) for _, q in top3]
            total = sum(weights)
            weights = [w / total for w in weights]
            idx = random.choices(range(len(top3)), weights=weights, k=1)[0]
            best_action, best_q = top3[idx]
        else:
            # Passive: random
            best_action, best_q = random.choice(actions_q)

        return {
            **best_action,
            "q_value": round(best_q, 4),
        }

    def _get_available_actions(self, target_node: str, node_states: dict) -> list[dict]:
        """Get contextually available actions."""
        state = node_states.get(target_node, "healthy")
        actions = [
            {"action_id": "MONITOR", "name": "Enhanced Monitoring",
             "description": "Increase detection sensitivity on target"},
        ]

        if state not in ("blocked", "isolated"):
            actions.append({
                "action_id": "BLOCK", "name": "SDN Isolate Host",
                "description": f"Isolate {target_node} via SDN controller",
                "target_node": target_node,
            })
            actions.append({
                "action_id": "PATCH", "name": "Emergency Patch",
                "description": f"Apply emergency security patch to {target_node}",
                "target_node": target_node,
            })
            actions.append({
                "action_id": "HONEYPOT", "name": "Deploy Honeypot",
                "description": f"Redirect {target_node} traffic to deception environment",
                "target_node": target_node,
            })

        if state in ("blocked", "isolated"):
            actions.append({
                "action_id": "RESTORE", "name": "Restore Host",
                "description": f"Restore {target_node} to normal operation",
                "target_node": target_node,
            })

        actions.append({
            "action_id": "SOAR", "name": "Execute SOAR Playbook",
            "description": "Run automated incident response playbook",
            "target_node": target_node,
        })

        return actions

    def _estimate_defensive_q(self, action: dict, anomaly_score: float,
                              target_node: str, node_states: dict,
                              compromised_nodes: list[str]) -> float:
        """Estimate Q-value for a defensive action."""
        aid = action.get("action_id", "MONITOR")
        state = node_states.get(target_node, "healthy")
        is_compromised = target_node in compromised_nodes

        q = 0.0

        if aid == "BLOCK" and is_compromised:
            q = 0.9 + anomaly_score * 0.3  # High value if node is compromised
        elif aid == "BLOCK" and anomaly_score > 0.7:
            q = 0.7 + anomaly_score * 0.2
        elif aid == "PATCH" and not is_compromised:
            q = 0.5 + (1 - anomaly_score) * 0.3  # Better to patch before compromise
        elif aid == "HONEYPOT":
            q = 0.4 + anomaly_score * 0.4  # Good when attack is in progress
        elif aid == "SOAR":
            q = 0.6 + anomaly_score * 0.2
        elif aid == "RESTORE" and state in ("blocked", "isolated") and not is_compromised:
            q = 0.8  # Restore clean nodes
        elif aid == "MONITOR":
            q = 0.2

        q += random.uniform(-0.05, 0.05)
        return q

    def execute_action(self, action: dict, node_states: dict) -> dict:
        """Execute the selected defensive action and return results."""
        aid = action.get("action_id", "MONITOR")
        target = action.get("target_node", "")

        reward = 0.0
        success = True

        if aid == "BLOCK":
            if target and target not in self.blocked_nodes:
                self.blocked_nodes.append(target)
                self.protected_count += 1
                reward = 2.0 + random.uniform(0, 1)
                # Record MTTR
                self.mttr_values.append(round(random.uniform(1.5, 6.0), 2))
            else:
                reward = -0.5
                success = False

        elif aid == "RESTORE":
            if target and target in self.blocked_nodes:
                self.blocked_nodes.remove(target)
                self.restored_nodes.append(target)
                reward = 1.0
            else:
                reward = -0.3
                success = False

        elif aid == "PATCH":
            reward = 1.5 + random.uniform(0, 0.5)
            self.protected_count += 1

        elif aid == "HONEYPOT":
            reward = 1.0 + random.uniform(0, 1)
            self.protected_count += 1

        elif aid == "SOAR":
            self.soar_stage = min(self.soar_stage + 1, self.soar_total)
            reward = 1.5
            self.protected_count += 1

        elif aid == "MONITOR":
            reward = 0.3

        self.cumulative_reward += reward

        return {
            "success": success,
            "reward": round(reward, 2),
            "action_taken": aid,
        }

    def get_state(self) -> dict:
        return {
            "mode": self.mode,
            "cumulative_reward": round(self.cumulative_reward, 2),
            "blocked_nodes": list(self.blocked_nodes),
            "restored_nodes": list(self.restored_nodes),
            "protected_count": self.protected_count,
            "detection_count": self.detection_count,
            "detection_rate": self.detection_rate,
            "total_detections": self.total_detections,
            "false_positives": self.false_positives,
            "mttd": self.mttd,
            "mttr": self.mttr,
            "soar_stage": self.soar_stage,
            "soar_total": self.soar_total,
        }
