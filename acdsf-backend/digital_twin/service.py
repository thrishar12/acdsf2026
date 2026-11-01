"""
ACDSF — Digital Twin Service
=============================
Provides thread-safe state transitions and synthetic telemetry generation
for the digital twin environment.
"""

import logging
from datetime import datetime
from database import get_db

logger = logging.getLogger("acdsf.digital_twin.service")


def mutate_asset_state(node_id: str, cpu_load: float = None, is_compromised: int = None, 
                       alert_increment: int = 0) -> bool:
    """
    Safely mutates the state of a digital twin asset using a DB transaction.
    """
    try:
        with get_db() as conn:
            # Fetch current state to apply increments if necessary
            row = conn.execute("SELECT * FROM twins WHERE node_id = ?", (node_id,)).fetchone()
            if not row:
                logger.warning(f"Cannot mutate unknown asset: {node_id}")
                return False
                
            current_cpu = row["cpu_load"]
            current_comp = row["is_compromised"]
            current_alerts = row["alert_count"]
            
            new_cpu = cpu_load if cpu_load is None else min(100.0, max(0.0, cpu_load))
            new_comp = current_comp if is_compromised is None else is_compromised
            new_alerts = current_alerts + alert_increment
            
            # Allow fallback if no update requested
            if cpu_load is None: new_cpu = current_cpu
            
            conn.execute(
                """UPDATE twins SET cpu_load=?, is_compromised=?, alert_count=?, last_updated=? 
                   WHERE node_id=?""",
                (new_cpu, new_comp, new_alerts, datetime.utcnow().isoformat(), node_id)
            )
        
        logger.info(f"Asset mutated: {node_id} | CPU: {new_cpu} | Comp: {new_comp} | Alerts: {new_alerts}")
        return True
    except Exception as e:
        logger.exception(f"Failed to mutate asset state for {node_id}: {e}")
        return False


def get_asset_state(node_id: str) -> dict:
    """Fetch current state for an asset."""
    try:
        with get_db() as conn:
            row = conn.execute("SELECT * FROM twins WHERE node_id = ?", (node_id,)).fetchone()
            if row:
                return dict(row)
    except Exception as e:
        logger.exception(f"Failed to get asset state for {node_id}: {e}")
    return {}
