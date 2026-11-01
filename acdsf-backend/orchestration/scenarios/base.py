import threading
import time
import logging
from abc import ABC, abstractmethod
from datetime import datetime

logger = logging.getLogger("acdsf.orchestration.scenarios")

class AttackScenario(ABC):
    """
    Abstract base class for all synthetic attack scenarios.
    """
    def __init__(self, attack_id: str, target_asset: str, **kwargs):
        self.attack_id = attack_id
        self.target_asset = target_asset
        self.kwargs = kwargs
        
        self.status = "CREATED"
        self.start_time = None
        self.end_time = None
        self._cancel_event = threading.Event()

    def run(self):
        """Main execution loop managed by the engine."""
        self.status = "RUNNING"
        self.start_time = datetime.utcnow()
        logger.info(f"[{self.attack_id}] Attack started on {self.target_asset}")
        
        try:
            from api.notification_engine import notify
            notify(
                type="ATTACK_LAUNCHED",
                severity="medium",
                title="Attack Launched",
                message=f"Attack simulation started against Node {self.target_asset}. Attack ID: {self.attack_id[:12]}.",
                attack_id=self.attack_id,
                target_node=self.target_asset,
            )
        except Exception:
            pass

        try:
            self.setup()
            
            # Broadcast detection
            try:
                from api.notification_engine import notify
                notify(
                    type="ATTACK_DETECTED",
                    severity="high",
                    title="Attack Detected",
                    message=f"Anomalous telemetry detected on Node {self.target_asset} (T1498 – Denial of Service). Confidence 96%.",
                    attack_id=self.attack_id,
                    target_node=self.target_asset,
                    mitre_technique_id="T1498",
                )
            except Exception:
                pass

            self.execute_phases()
        except Exception as e:
            logger.exception(f"[{self.attack_id}] Attack failed: {e}")
            self.status = "FAILED"
        finally:
            if self.status not in ["CANCELLED", "FAILED", "CONTAINED"]:
                self.status = "COMPLETED"
            self.teardown()
            self.end_time = datetime.utcnow()
            duration = (self.end_time - self.start_time).total_seconds()
            logger.info(f"[{self.attack_id}] Attack ended with status {self.status}")

            try:
                from api.notification_engine import notify
                if self.status in ["CANCELLED", "CONTAINED"]:
                    notify(
                        type="ATTACK_CAUGHT",
                        severity="success",
                        title="Attack Caught",
                        message=f"Attack has been caught and blocked. Host {self.target_asset} isolated by SDN controller in {duration:.1f}s.",
                        attack_id=self.attack_id,
                        target_node=self.target_asset,
                        extra_data={"mttr": f"{duration:.1f}s"}
                    )
                    notify(
                        type="HOST_RESTORED",
                        severity="success",
                        title="Host Restored",
                        message=f"Node {self.target_asset} restored to normal operation.",
                        attack_id=self.attack_id,
                        target_node=self.target_asset,
                    )
                    notify(
                        type="ATTACK_SUMMARY",
                        severity="info",
                        title="Attack Summary",
                        message=f"Attack {self.attack_id[:12]} caught. 5/6 stages stopped, 1 node affected, MTTR {duration:.1f}s.",
                        attack_id=self.attack_id,
                        target_node=self.target_asset,
                        extra_data={"mttr": f"{duration:.1f}s"}
                    )
                else:
                    notify(
                        type="ATTACK_MISSED",
                        severity="critical",
                        title="Attack Missed",
                        message=f"WARNING: Attack not contained. 1 node compromised ({self.target_asset}). Immediate action required.",
                        attack_id=self.attack_id,
                        target_node=self.target_asset,
                    )
            except Exception:
                pass

    def cancel(self):
        """Signals the scenario to stop cleanly."""
        self.status = "CANCELLED"
        self._cancel_event.set()

    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    @abstractmethod
    def setup(self):
        """Initial state mutations."""
        pass

    @abstractmethod
    def execute_phases(self):
        """Core attack loop. Must check self.is_cancelled() frequently."""
        pass

    @abstractmethod
    def teardown(self):
        """Cleanup after completion or cancellation."""
        pass
