from orchestration.scenarios.dos_flood import DoSFloodScenario
from orchestration.scenarios.lateral_movement import LateralMovementScenario
from orchestration.scenarios.ransomware import RansomwareScenario

SCENARIO_REGISTRY = {
    "T1498": DoSFloodScenario,
    "T1021.002": LateralMovementScenario,
    "T1486": RansomwareScenario,
}

def get_scenario_class(attack_type: str):
    return SCENARIO_REGISTRY.get(attack_type)
