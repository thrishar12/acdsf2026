"""
ACDSF — Attack Orchestration Engine
===================================
Manages concurrent execution of synthetic attack scenarios.
"""

import threading
import uuid
import logging
from typing import Dict
from orchestration.scenarios.base import AttackScenario

logger = logging.getLogger("acdsf.orchestration.engine")

class Orchestrator:
    def __init__(self):
        self.active_attacks: Dict[str, AttackScenario] = {}
        self.attack_threads: Dict[str, threading.Thread] = {}
        self.lock = threading.RLock()

    def launch_attack(self, scenario: AttackScenario) -> str:
        """Starts an attack scenario in a background thread."""
        with self.lock:
            self.active_attacks[scenario.attack_id] = scenario
            
            thread = threading.Thread(
                target=self._run_scenario, 
                args=(scenario,),
                name=f"Attack-{scenario.attack_id}"
            )
            self.attack_threads[scenario.attack_id] = thread
            thread.daemon = True
            thread.start()
            
            return scenario.attack_id

    def _run_scenario(self, scenario: AttackScenario):
        try:
            scenario.run()
        except Exception as e:
            logger.exception(f"Unexpected crash in attack thread {scenario.attack_id}: {e}")

    def cancel_attack(self, attack_id: str) -> bool:
        """Signals an attack to cancel gracefully."""
        with self.lock:
            if attack_id not in self.active_attacks:
                return False
            
            scenario = self.active_attacks[attack_id]
            if scenario.status in ["COMPLETED", "CANCELLED", "FAILED", "CONTAINED"]:
                return False
                
            scenario.cancel()
            return True

    def _format_status(self, sc: AttackScenario) -> dict:
        return {
            "id": sc.attack_id,
            "target": sc.target_asset,
            "status": sc.status,
            "start_time": sc.start_time.isoformat() if sc.start_time else None,
            "end_time": sc.end_time.isoformat() if sc.end_time else None
        }

    def get_attack_status(self, attack_id: str) -> dict:
        """Returns current state of an attack."""
        with self.lock:
            if attack_id not in self.active_attacks:
                return None
            return self._format_status(self.active_attacks[attack_id])
            
    def list_attacks(self) -> list:
        with self.lock:
            return [self._format_status(sc) for sc in self.active_attacks.values()]

# Global singleton
orchestrator = Orchestrator()
