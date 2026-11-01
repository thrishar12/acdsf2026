import time
import logging
from orchestration.scenarios.base import AttackScenario
from digital_twin.service import mutate_asset_state, get_asset_state
from digital_twin.sdn import increase_latency, reset_latency

logger = logging.getLogger("acdsf.orchestration.scenarios.dos")

class DoSFloodScenario(AttackScenario):
    """
    Simulates a DoS/Traffic Flood.
    MITRE ATT&CK: T1498 - Network Denial of Service
    """
    
    def setup(self):
        self.source = self.kwargs.get("source", "UNKNOWN")
        logger.info(f"[{self.attack_id}] DoS Setup: Targeting {self.target_asset} from {self.source}")
        # Initial spike in CPU and alerts
        mutate_asset_state(self.target_asset, cpu_load=85.0, alert_increment=1)
        increase_latency(self.source, self.target_asset, 150.0)

    def execute_phases(self):
        duration = self.kwargs.get("duration_seconds", 30)
        start_time = time.time()
        
        while time.time() - start_time < duration:
            if self.is_cancelled():
                logger.info(f"[{self.attack_id}] DoS Cancelled midway.")
                break
                
            # Randomly fluctuate CPU between 85-100%
            import random
            cpu = random.uniform(85.0, 100.0)
            mutate_asset_state(self.target_asset, cpu_load=cpu, is_compromised=1)
            
            # Check if SDN controller isolated the host
            state = get_asset_state(self.target_asset)
            # If the backend isolated it, maybe it clears the edges
            # For now, just wait
            time.sleep(2)
            
    def teardown(self):
        logger.info(f"[{self.attack_id}] DoS Teardown")
        reset_latency(self.source, self.target_asset)
        mutate_asset_state(self.target_asset, cpu_load=15.0, is_compromised=0)
