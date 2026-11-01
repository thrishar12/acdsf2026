"""
ACDSF — AI/CICIDS2017 Detection Engine
========================================
Generates synthetic traffic features matching the CICIDS2017 dataset schema
and classifies them to produce detection results with confidence scores,
severity levels, and MITRE ATT&CK mappings.

This module serves as the AI detection pipeline that every simulation scenario
feeds into. It does NOT perform real network attacks.
"""

import logging
import random
import time
from datetime import datetime

logger = logging.getLogger("acdsf.ai.detector")

# ---------------------------------------------------------------------------
# CICIDS2017-aligned feature profiles for each attack type
# ---------------------------------------------------------------------------
ATTACK_PROFILES = {
    "DDoS Simulation": {
        "label": "DDoS Attack",
        "mitre_tactic": "Impact",
        "mitre_technique_id": "T1498",
        "mitre_technique_name": "Network Denial of Service",
        "severity_base": "HIGH",
        "asset_criticality": 80,
        "features": {
            "Flow Packets/s": lambda: random.uniform(8000, 15000),
            "Flow Bytes/s": lambda: random.uniform(2_000_000, 8_000_000),
            "Fwd Packet Length Max": lambda: random.uniform(1400, 1500),
            "Bwd Packet Length Mean": lambda: random.uniform(0, 50),
            "Flow Duration": lambda: random.uniform(0.001, 0.05),
            "Subflow Fwd Bytes": lambda: random.uniform(50000, 200000),
            "Packet Length Std": lambda: random.uniform(10, 100),
            "Connection Frequency": lambda: random.uniform(500, 2000),
        },
        "base_confidence": (88, 98),
    },
    "Port Scan Simulation": {
        "label": "Port Scan",
        "mitre_tactic": "Reconnaissance",
        "mitre_technique_id": "T1046",
        "mitre_technique_name": "Network Service Scanning",
        "severity_base": "MEDIUM",
        "asset_criticality": 50,
        "features": {
            "Flow Packets/s": lambda: random.uniform(100, 500),
            "Flow Bytes/s": lambda: random.uniform(1000, 10000),
            "Fwd Packet Length Max": lambda: random.uniform(40, 80),
            "Bwd Packet Length Mean": lambda: random.uniform(0, 20),
            "Flow Duration": lambda: random.uniform(0.0001, 0.001),
            "Subflow Fwd Bytes": lambda: random.uniform(100, 1000),
            "Packet Length Std": lambda: random.uniform(0, 10),
            "Connection Frequency": lambda: random.uniform(1000, 5000),
        },
        "base_confidence": (82, 95),
    },
    "Brute Force Simulation": {
        "label": "Brute Force Attack",
        "mitre_tactic": "Credential Access",
        "mitre_technique_id": "T1110",
        "mitre_technique_name": "Brute Force",
        "severity_base": "CRITICAL",
        "asset_criticality": 90,
        "features": {
            "Flow Packets/s": lambda: random.uniform(50, 200),
            "Flow Bytes/s": lambda: random.uniform(5000, 50000),
            "Fwd Packet Length Max": lambda: random.uniform(200, 600),
            "Bwd Packet Length Mean": lambda: random.uniform(100, 400),
            "Flow Duration": lambda: random.uniform(0.5, 3.0),
            "Subflow Fwd Bytes": lambda: random.uniform(5000, 30000),
            "Packet Length Std": lambda: random.uniform(50, 200),
            "Connection Frequency": lambda: random.uniform(10, 100),
        },
        "base_confidence": (85, 97),
    },
    "DoS Simulation": {
        "label": "DoS Attack",
        "mitre_tactic": "Impact",
        "mitre_technique_id": "T1499",
        "mitre_technique_name": "Endpoint Denial of Service",
        "severity_base": "HIGH",
        "asset_criticality": 75,
        "features": {
            "Flow Packets/s": lambda: random.uniform(3000, 8000),
            "Flow Bytes/s": lambda: random.uniform(500_000, 3_000_000),
            "Fwd Packet Length Max": lambda: random.uniform(1400, 1500),
            "Bwd Packet Length Mean": lambda: random.uniform(0, 30),
            "Flow Duration": lambda: random.uniform(0.002, 0.1),
            "Subflow Fwd Bytes": lambda: random.uniform(20000, 100000),
            "Packet Length Std": lambda: random.uniform(5, 80),
            "Connection Frequency": lambda: random.uniform(200, 800),
        },
        "base_confidence": (86, 96),
    },
    "Network Intrusion Simulation": {
        "label": "Network Intrusion",
        "mitre_tactic": "Lateral Movement",
        "mitre_technique_id": "T1021",
        "mitre_technique_name": "Remote Services",
        "severity_base": "CRITICAL",
        "asset_criticality": 95,
        "features": {
            "Flow Packets/s": lambda: random.uniform(20, 100),
            "Flow Bytes/s": lambda: random.uniform(10000, 100000),
            "Fwd Packet Length Max": lambda: random.uniform(500, 1400),
            "Bwd Packet Length Mean": lambda: random.uniform(200, 800),
            "Flow Duration": lambda: random.uniform(1.0, 10.0),
            "Subflow Fwd Bytes": lambda: random.uniform(10000, 50000),
            "Packet Length Std": lambda: random.uniform(100, 400),
            "Connection Frequency": lambda: random.uniform(5, 50),
        },
        "base_confidence": (80, 94),
    },
}

SEVERITY_WEIGHTS = {"LOW": 25, "MEDIUM": 50, "HIGH": 75, "CRITICAL": 100}


def _compute_risk_score(severity: str, confidence: float, asset_criticality: int) -> tuple[int, str]:
    """
    Risk Score = (Severity Weight × 0.4) + (Confidence × 0.3) + (Asset Criticality × 0.3)
    All inputs normalised to 0–100 scale.
    """
    sev_w = SEVERITY_WEIGHTS.get(severity, 50)
    raw = (sev_w * 0.4) + (confidence * 0.3) + (asset_criticality * 0.3)
    score = min(100, max(0, round(raw)))

    if score <= 25:
        level = "LOW"
    elif score <= 50:
        level = "MEDIUM"
    elif score <= 75:
        level = "HIGH"
    else:
        level = "CRITICAL"

    return score, level


def detect(attack_type: str, target_node: str, delay_seconds: float = 3.0) -> dict:
    """
    Simulate the AI detection pipeline:
    1. Wait `delay_seconds` to simulate processing time
    2. Generate CICIDS2017-aligned feature vector
    3. Classify and return full detection result

    Returns a dict with all detection fields required by the incident model.
    """
    profile = ATTACK_PROFILES.get(attack_type)
    if not profile:
        logger.warning("No profile found for attack_type=%s, using generic", attack_type)
        profile = ATTACK_PROFILES["DoS Simulation"]

    # Simulate detection delay (AI processing)
    time.sleep(delay_seconds)

    # Generate feature vector
    features = {k: round(v(), 4) for k, v in profile["features"].items()}

    # Simulate model confidence
    conf_min, conf_max = profile["base_confidence"]
    confidence = round(random.uniform(conf_min, conf_max), 1)

    severity = profile["severity_base"]
    asset_criticality = profile["asset_criticality"]

    risk_score, risk_level = _compute_risk_score(severity, confidence, asset_criticality)

    result = {
        "attack_label": profile["label"],
        "detection_status": "DETECTED",
        "confidence_score": confidence,
        "severity": severity,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "mitre_tactic": profile["mitre_tactic"],
        "mitre_technique_id": profile["mitre_technique_id"],
        "mitre_technique_name": profile["mitre_technique_name"],
        "key_indicators": features,
        "attack_detected_at": datetime.utcnow().isoformat(),
    }

    logger.info(
        "AI Detection: attack=%s target=%s confidence=%.1f%% severity=%s risk=%d",
        attack_type, target_node, confidence, severity, risk_score,
    )
    return result
