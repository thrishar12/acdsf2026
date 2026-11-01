import time
import logging
from orchestration.scenarios.base import AttackScenario
from digital_twin.service import mutate_asset_state

logger = logging.getLogger("acdsf.orchestration.scenarios.ransomware")

class RansomwareScenario(AttackScenario):
    """
    Simulates a Ransomware attack on an asset.
    """
    def setup(self):
        logger.info(f"[{self.attack_id}] Ransomware Setup: Targeting {self.target_asset}")
        mutate_asset_state(self.target_asset, cpu_load=30.0, alert_increment=1)
        
    def execute_phases(self):
        logger.info(f"[{self.attack_id}] Initiating simulated file encryption...")
        
        for i in range(5):
            if self.is_cancelled(): return
            time.sleep(2)
            mutate_asset_state(self.target_asset, cpu_load=90.0, alert_increment=1)
            
        logger.info(f"[{self.attack_id}] Simulated encryption complete. Asset compromised.")
        mutate_asset_state(self.target_asset, is_compromised=1)

    def teardown(self):
        logger.info(f"[{self.attack_id}] Ransomware Teardown")
