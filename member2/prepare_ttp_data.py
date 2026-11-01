"""
prepare_ttp_data.py
--------------------
ACDSF Member 2 — TTP Extraction: Training Data Preparation

Builds a labeled dataset directly from real MITRE ATT&CK technique
descriptions (the same official dataset your knowledge_graph.py already
uses), pairing each technique's real description text with its real
tactic label. This is the same approach the original guide's
prepare_training_data.py uses — genuine ATT&CK data, not synthetic text.

Usage:
    python prepare_ttp_data.py
"""

import json
import requests

ATTACK_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/"
    "enterprise-attack/enterprise-attack.json"
)

TACTIC_LABELS = {
    "initial-access": 0, "execution": 1, "persistence": 2,
    "privilege-escalation": 3, "defense-evasion": 4, "credential-access": 5,
    "discovery": 6, "lateral-movement": 7, "collection": 8,
    "command-and-control": 9, "exfiltration": 10, "impact": 11,
    "reconnaissance": 12, "resource-development": 13,
}
LABEL_NAMES = {v: k for k, v in TACTIC_LABELS.items()}
OUTPUT_PATH = "attack_dataset.jsonl"


def build_dataset():
    print("Downloading MITRE ATT&CK Enterprise dataset...")
    data = requests.get(ATTACK_URL, timeout=60).json()

    samples = []
    for obj in data["objects"]:
        if obj.get("type") != "attack-pattern":
            continue
        description = obj.get("description")
        phases = obj.get("kill_chain_phases", [])
        if not description or not phases:
            continue
        tactic = phases[0].get("phase_name")
        if tactic not in TACTIC_LABELS:
            continue
        # Keep descriptions a reasonable length; strip citation markers like (Citation: X)
        clean_text = description.split("\n")[0][:500]
        samples.append({"text": clean_text, "label": TACTIC_LABELS[tactic]})

    with open(OUTPUT_PATH, "w") as f:
        for s in samples:
            f.write(json.dumps(s) + "\n")

    print(f"Created {len(samples)} labeled training samples -> {OUTPUT_PATH}")

    # Show label distribution so it's clear the dataset isn't degenerate
    from collections import Counter
    counts = Counter(s["label"] for s in samples)
    print("\nLabel distribution:")
    for label_id, count in sorted(counts.items()):
        print(f"  {LABEL_NAMES[label_id]}: {count}")


if __name__ == "__main__":
    build_dataset()
