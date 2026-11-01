import time
import logging
from orchestration.scenarios.base import AttackScenario
from digital_twin.service import mutate_asset_state

logger = logging.getLogger("acdsf.orchestration.scenarios.lateral_movement")

class LateralMovementScenario(AttackScenario):
    """
    Simulates Lateral Movement.
    MITRE ATT&CK: T1021.002 - SMB/Windows Admin Shares
    """
    
    def setup(self):
        self.source = self.kwargs.get("source", "UNKNOWN")
        logger.info(f"[{self.attack_id}] Lateral Movement Setup: Targeting {self.target_asset} from {self.source}")
        
    def execute_phases(self):
        # Phase 1: Recon & Auth Attempt
        logger.info(f"[{self.attack_id}] Attempting authentication against administrative shares...")
        time.sleep(2)
        if self.is_cancelled(): return
        
        # Phase 2: Execution & Compromise
        logger.info(f"[{self.attack_id}] Credential reuse successful. Propagating to {self.target_asset}")
        mutate_asset_state(self.target_asset, cpu_load=45.0, alert_increment=1, is_compromised=1)
        time.sleep(2)
            
    def teardown(self):
        logger.info(f"[{self.attack_id}] Lateral Movement Teardown")
