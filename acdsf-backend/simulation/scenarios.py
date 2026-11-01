"""
ACDSF — Simulation Scenarios
==============================
Defines scenario configurations for APT, Ransomware, DDoS, and Insider threat
campaigns, each with MITRE ATT&CK mapped kill chain stages.
"""

import random

# ---------------------------------------------------------------------------
# 6-Stage Kill Chain (MITRE ATT&CK mapped)
# ---------------------------------------------------------------------------
KILL_CHAIN_STAGES = [
    {
        "stage": 1,
        "name": "Reconnaissance",
        "mitre_tactic": "Reconnaissance",
        "description": "Scanning and enumerating target network",
    },
    {
        "stage": 2,
        "name": "Initial Access",
        "mitre_tactic": "Initial Access",
        "description": "Gaining foothold via exploit or phishing",
    },
    {
        "stage": 3,
        "name": "Execution & Persistence",
        "mitre_tactic": "Execution",
        "description": "Executing payload and establishing persistence",
    },
    {
        "stage": 4,
        "name": "Privilege Escalation",
        "mitre_tactic": "Privilege Escalation",
        "description": "Escalating from user to admin/root privileges",
    },
    {
        "stage": 5,
        "name": "Lateral Movement",
        "mitre_tactic": "Lateral Movement",
        "description": "Moving across network to reach high-value targets",
    },
    {
        "stage": 6,
        "name": "Impact / Exfiltration",
        "mitre_tactic": "Exfiltration",
        "description": "Achieving objective — data theft, destruction, or disruption",
    },
]

# ---------------------------------------------------------------------------
# Red Team attack techniques per stage (MITRE mapped)
# ---------------------------------------------------------------------------
RED_TECHNIQUES = {
    "APT": {
        1: [
            {"id": "T1595", "name": "Active Scanning", "success_base": 0.90, "stealth": 0.7},
            {"id": "T1592", "name": "Gather Victim Host Information", "success_base": 0.85, "stealth": 0.8},
        ],
        2: [
            {"id": "T1566", "name": "Phishing", "success_base": 0.65, "stealth": 0.5},
            {"id": "T1190", "name": "Exploit Public-Facing Application", "success_base": 0.55, "stealth": 0.4},
        ],
        3: [
            {"id": "T1059", "name": "Command and Scripting Interpreter", "success_base": 0.70, "stealth": 0.5},
            {"id": "T1547", "name": "Boot or Logon Autostart Execution", "success_base": 0.60, "stealth": 0.4},
        ],
        4: [
            {"id": "T1068", "name": "Exploitation for Privilege Escalation", "success_base": 0.55, "stealth": 0.3},
            {"id": "T1548", "name": "Abuse Elevation Control Mechanism", "success_base": 0.50, "stealth": 0.35},
        ],
        5: [
            {"id": "T1021", "name": "Remote Services", "success_base": 0.60, "stealth": 0.4},
            {"id": "T1570", "name": "Lateral Tool Transfer", "success_base": 0.55, "stealth": 0.35},
        ],
        6: [
            {"id": "T1041", "name": "Exfiltration Over C2 Channel", "success_base": 0.50, "stealth": 0.3},
            {"id": "T1567", "name": "Exfiltration Over Web Service", "success_base": 0.45, "stealth": 0.25},
        ],
    },
    "Ransomware": {
        1: [
            {"id": "T1046", "name": "Network Service Scanning", "success_base": 0.88, "stealth": 0.6},
            {"id": "T1595", "name": "Active Scanning", "success_base": 0.90, "stealth": 0.7},
        ],
        2: [
            {"id": "T1566.001", "name": "Spearphishing Attachment", "success_base": 0.60, "stealth": 0.45},
            {"id": "T1078", "name": "Valid Accounts", "success_base": 0.50, "stealth": 0.55},
        ],
        3: [
            {"id": "T1059.001", "name": "PowerShell Execution", "success_base": 0.65, "stealth": 0.4},
            {"id": "T1053", "name": "Scheduled Task/Job", "success_base": 0.60, "stealth": 0.45},
        ],
        4: [
            {"id": "T1068", "name": "Exploitation for Privilege Escalation", "success_base": 0.55, "stealth": 0.3},
            {"id": "T1134", "name": "Access Token Manipulation", "success_base": 0.50, "stealth": 0.35},
        ],
        5: [
            {"id": "T1021.002", "name": "SMB/Windows Admin Shares", "success_base": 0.55, "stealth": 0.3},
            {"id": "T1080", "name": "Taint Shared Content", "success_base": 0.50, "stealth": 0.25},
        ],
        6: [
            {"id": "T1486", "name": "Data Encrypted for Impact", "success_base": 0.60, "stealth": 0.1},
            {"id": "T1490", "name": "Inhibit System Recovery", "success_base": 0.55, "stealth": 0.15},
        ],
    },
    "DDoS": {
        1: [
            {"id": "T1595", "name": "Active Scanning", "success_base": 0.92, "stealth": 0.5},
            {"id": "T1590", "name": "Gather Victim Network Information", "success_base": 0.88, "stealth": 0.6},
        ],
        2: [
            {"id": "T1190", "name": "Exploit Public-Facing Application", "success_base": 0.70, "stealth": 0.3},
            {"id": "T1133", "name": "External Remote Services", "success_base": 0.65, "stealth": 0.35},
        ],
        3: [
            {"id": "T1059", "name": "Command and Scripting Interpreter", "success_base": 0.75, "stealth": 0.3},
            {"id": "T1053", "name": "Scheduled Task/Job", "success_base": 0.70, "stealth": 0.35},
        ],
        4: [
            {"id": "T1068", "name": "Exploitation for Privilege Escalation", "success_base": 0.60, "stealth": 0.25},
            {"id": "T1548", "name": "Abuse Elevation Control Mechanism", "success_base": 0.55, "stealth": 0.3},
        ],
        5: [
            {"id": "T1021", "name": "Remote Services", "success_base": 0.65, "stealth": 0.25},
            {"id": "T1570", "name": "Lateral Tool Transfer", "success_base": 0.60, "stealth": 0.2},
        ],
        6: [
            {"id": "T1498", "name": "Network Denial of Service", "success_base": 0.75, "stealth": 0.05},
            {"id": "T1499", "name": "Endpoint Denial of Service", "success_base": 0.70, "stealth": 0.1},
        ],
    },
    "Insider": {
        1: [
            {"id": "T1087", "name": "Account Discovery", "success_base": 0.95, "stealth": 0.9},
            {"id": "T1083", "name": "File and Directory Discovery", "success_base": 0.92, "stealth": 0.85},
        ],
        2: [
            {"id": "T1078", "name": "Valid Accounts", "success_base": 0.85, "stealth": 0.8},
            {"id": "T1133", "name": "External Remote Services", "success_base": 0.80, "stealth": 0.7},
        ],
        3: [
            {"id": "T1059", "name": "Command and Scripting Interpreter", "success_base": 0.80, "stealth": 0.7},
            {"id": "T1053", "name": "Scheduled Task/Job", "success_base": 0.75, "stealth": 0.65},
        ],
        4: [
            {"id": "T1134", "name": "Access Token Manipulation", "success_base": 0.70, "stealth": 0.6},
            {"id": "T1548", "name": "Abuse Elevation Control Mechanism", "success_base": 0.65, "stealth": 0.55},
        ],
        5: [
            {"id": "T1021", "name": "Remote Services", "success_base": 0.75, "stealth": 0.6},
            {"id": "T1080", "name": "Taint Shared Content", "success_base": 0.70, "stealth": 0.55},
        ],
        6: [
            {"id": "T1567", "name": "Exfiltration Over Web Service", "success_base": 0.70, "stealth": 0.5},
            {"id": "T1048", "name": "Exfiltration Over Alternative Protocol", "success_base": 0.65, "stealth": 0.45},
        ],
    },
}

# ---------------------------------------------------------------------------
# Blue Team defensive actions
# ---------------------------------------------------------------------------
BLUE_ACTIONS = [
    {"id": "MONITOR", "name": "Enhanced Monitoring", "description": "Increase anomaly detection sensitivity"},
    {"id": "BLOCK", "name": "SDN Isolate Host", "description": "Block all traffic to/from compromised host via SDN controller"},
    {"id": "RESTORE", "name": "Restore Host", "description": "Restore previously isolated host to normal operation"},
    {"id": "PATCH", "name": "Emergency Patch", "description": "Apply emergency security patch to vulnerable service"},
    {"id": "HONEYPOT", "name": "Deploy Honeypot", "description": "Redirect attacker to deception environment"},
    {"id": "SOAR", "name": "Execute SOAR Playbook", "description": "Run automated incident response playbook"},
]

# ---------------------------------------------------------------------------
# SOAR Playbook stages
# ---------------------------------------------------------------------------
SOAR_PLAYBOOKS = {
    "APT": [
        "Triage: Correlate IOCs across SIEM",
        "Contain: Isolate affected hosts via SDN",
        "Eradicate: Remove persistence mechanisms",
        "Recover: Restore from clean backup",
        "Report: Generate incident report",
    ],
    "Ransomware": [
        "Triage: Identify encryption scope",
        "Contain: Network segmentation enforcement",
        "Eradicate: Kill malicious processes",
        "Recover: Restore encrypted files from backup",
        "Report: Compliance notification",
    ],
    "DDoS": [
        "Triage: Identify attack vector and source",
        "Mitigate: Apply rate limiting & BGP Flowspec",
        "Contain: Block malicious IPs at edge",
        "Recover: Restore service availability",
        "Report: Generate DDoS mitigation report",
    ],
    "Insider": [
        "Triage: Audit user activity logs",
        "Contain: Revoke compromised credentials",
        "Investigate: Forensic data collection",
        "Recover: Reset affected accounts",
        "Report: HR and compliance notification",
    ],
}


def get_scenario_config(scenario: str) -> dict:
    """Return full scenario configuration."""
    techniques = RED_TECHNIQUES.get(scenario, RED_TECHNIQUES["APT"])
    playbook = SOAR_PLAYBOOKS.get(scenario, SOAR_PLAYBOOKS["APT"])
    return {
        "scenario": scenario,
        "kill_chain": KILL_CHAIN_STAGES,
        "techniques": techniques,
        "playbook": playbook,
        "blue_actions": BLUE_ACTIONS,
    }


def select_red_technique(scenario: str, stage: int) -> dict:
    """Select a random technique for the given stage."""
    techniques = RED_TECHNIQUES.get(scenario, RED_TECHNIQUES["APT"])
    stage_techs = techniques.get(stage, techniques.get(1, []))
    return random.choice(stage_techs) if stage_techs else {
        "id": "T1595", "name": "Active Scanning", "success_base": 0.80, "stealth": 0.5
    }
