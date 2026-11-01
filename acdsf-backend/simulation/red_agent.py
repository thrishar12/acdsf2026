"""
ACDSF — DQN Red Team Agent
=============================
Simulates a DQN reinforcement learning red agent that selects attack actions
based on Q-value estimates. Uses the 6-stage MITRE-mapped kill chain and
evaluates success probability against target node defences.
"""

import logging
import math
import random
from typing import Optional

logger = logging.getLogger("acdsf.simulation.red_agent")


class RedAgent:
    """
    DQN-style Red Team agent for the simulation.
    
    The agent maintains:
    - Current kill chain stage (1-6)
    - Cumulative reward
    - Compromised node set
    - Q-value estimates for action selection
    """

    def __init__(self, scenario: str, difficulty: str = "medium", target_sector: str = ""):
        self.scenario = scenario
        self.difficulty = difficulty
        self.target_sector = target_sector
        self.current_stage = 1
        self.cumulative_reward = 0.0
        self.compromised_nodes: list[str] = []
        self.success_count = 0
        self.fail_count = 0
        self.total_actions = 0

        # DQN-style Q-table (simplified — node_id → estimated value)
        self.q_values: dict[str, float] = {}

        # Difficulty multipliers
        self._difficulty_mult = {
            "easy": 1.3,
            "medium": 1.0,
            "hard": 0.7,
            "expert": 0.5,
        }.get(difficulty, 1.0)

    @property
    def success_rate(self) -> float:
        if self.total_actions == 0:
            return 0.0
        return round(self.success_count / self.total_actions * 100, 1)

    def select_target(self, available_nodes: list[dict], topology_edges: list[dict]) -> dict:
        """
        Select target node using DQN-style Q-value estimation.
        Prioritizes:
        1. Nodes in the target sector (if specified)
        2. High-criticality nodes
        3. Nodes adjacent to already-compromised nodes (for lateral movement)
        4. Exploration via epsilon-greedy
        """
        if not available_nodes:
            return {}

        epsilon = max(0.1, 0.4 - (self.total_actions * 0.02))  # Decay exploration

        # Calculate Q-values for each candidate
        candidates = []
        for node in available_nodes:
            nid = node.get("id", node.get("node_id", ""))
            if nid in self.compromised_nodes:
                continue  # Skip already compromised

            q = self._estimate_q_value(node, topology_edges)
            self.q_values[nid] = q
            candidates.append((node, q))

        if not candidates:
            # All nodes compromised or no targets — pick any
            node = random.choice(available_nodes)
            return node

        # Epsilon-greedy selection
        if random.random() < epsilon:
            # Explore: random target
            node, q = random.choice(candidates)
        else:
            # Exploit: highest Q-value
            candidates.sort(key=lambda x: x[1], reverse=True)
            node, q = candidates[0]

        return node

    def _estimate_q_value(self, node: dict, edges: list[dict]) -> float:
        """
        Estimate Q-value for attacking a node.
        Factors: criticality, adjacency to compromised, sector match, vulnerability.
        """
        nid = node.get("id", node.get("node_id", ""))
        criticality = node.get("criticality", 5) / 10.0
        sector = node.get("sector", "")

        # Sector bonus
        sector_bonus = 0.2 if (self.target_sector and sector == self.target_sector) else 0.0

        # Adjacency bonus (higher if adjacent to a compromised node)
        adjacency_bonus = 0.0
        for edge in edges:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if (src == nid and tgt in self.compromised_nodes) or \
               (tgt == nid and src in self.compromised_nodes):
                adjacency_bonus = 0.3
                break

        # Node type bonus
        type_bonus = {
            "server": 0.25,
            "firewall": 0.15,
            "router": 0.1,
            "switch": 0.05,
            "endpoint": 0.2,
            "backbone_router": 0.3,
        }.get(node.get("type", ""), 0.1)

        # Stage-based strategy
        stage_weight = 0.0
        if self.current_stage <= 2:
            # Early stages: prefer endpoints and entry points
            if node.get("type") in ("endpoint", "server"):
                stage_weight = 0.15
        elif self.current_stage >= 5:
            # Late stages: prefer high-value servers
            if node.get("type") in ("server", "backbone_router"):
                stage_weight = 0.2

        q = criticality + sector_bonus + adjacency_bonus + type_bonus + stage_weight
        # Add noise for realism
        q += random.uniform(-0.05, 0.05)
        return round(q, 4)

    def execute_action(self, technique: dict, target_node: dict, node_states: dict) -> dict:
        """
        Execute an attack action and determine success/failure.
        Returns action result with rewards.
        """
        self.total_actions += 1
        nid = target_node.get("id", target_node.get("node_id", ""))

        # Base success probability from technique
        base_prob = technique.get("success_base", 0.5) * self._difficulty_mult

        # Penalty if node is blocked/isolated
        node_state = node_states.get(nid, "healthy")
        if node_state in ("blocked", "isolated"):
            base_prob *= 0.1  # Very hard to attack isolated nodes

        # Penalty for higher stages (harder to progress)
        stage_penalty = max(0, (self.current_stage - 1) * 0.05)
        final_prob = max(0.05, min(0.95, base_prob - stage_penalty))

        # Roll for success
        success = random.random() < final_prob
        confidence = round(final_prob * 100 + random.uniform(-5, 5), 1)

        if success:
            self.success_count += 1
            reward = round(target_node.get("criticality", 5) * 0.5 + random.uniform(0.5, 2.0), 2)
            if nid not in self.compromised_nodes:
                self.compromised_nodes.append(nid)
        else:
            self.fail_count += 1
            reward = round(-0.5 - random.uniform(0, 1), 2)

        self.cumulative_reward += reward

        return {
            "success": success,
            "reward": reward,
            "confidence": max(0, min(100, confidence)),
            "q_value": round(self.q_values.get(nid, 0.5), 4),
            "explanation": self._explain_action(technique, target_node, success),
        }

    def _explain_action(self, technique: dict, target: dict, success: bool) -> str:
        nid = target.get("id", target.get("node_id", ""))
        tname = technique.get("name", "Unknown")
        if success:
            return f"Red Agent deployed {tname} against {nid} — exploit successful. " \
                   f"Q-value: {self.q_values.get(nid, 0):.3f}, confidence in target selection was high."
        else:
            return f"Red Agent attempted {tname} on {nid} — blocked by defences. " \
                   f"Q-value: {self.q_values.get(nid, 0):.3f}, attack vector was mitigated."

    def advance_stage(self) -> bool:
        """Advance to next kill chain stage. Returns False if already at stage 6."""
        if self.current_stage < 6:
            self.current_stage += 1
            logger.info("Red agent advanced to stage %d", self.current_stage)
            return True
        return False

    def get_state(self) -> dict:
        return {
            "stage": self.current_stage,
            "stage_name": self._get_stage_name(),
            "cumulative_reward": round(self.cumulative_reward, 2),
            "compromised_count": len(self.compromised_nodes),
            "compromised_nodes": list(self.compromised_nodes),
            "success_rate": self.success_rate,
            "total_actions": self.total_actions,
            "difficulty": self.difficulty,
        }

    def _get_stage_name(self) -> str:
        from simulation.scenarios import KILL_CHAIN_STAGES
        for s in KILL_CHAIN_STAGES:
            if s["stage"] == self.current_stage:
                return s["name"]
        return f"Stage {self.current_stage}"
