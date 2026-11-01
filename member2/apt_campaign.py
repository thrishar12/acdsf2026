"""
apt_campaign.py
----------------
ACDSF Member 2 — APT Campaign Emulation (lightweight CALDERA replacement)

CALDERA needs a full server, real target VMs to deploy agents onto, and Go
+ Python toolchains — none of which fit an 8GB laptop or your Member 1
topology (which is itself a lightweight simulation, not real GNS3 VMs with
SSH access).

Instead, this module implements a real, staged APT28-style attack chain as
a Python state machine. Each stage maps to a REAL MITRE ATT&CK technique ID
(the same ones your knowledge_graph.py already tracks), and where a stage
has an observable effect on your Member 1 infrastructure, it actually calls
your live SDN controller API — so the "attack" has a real, verifiable
side-effect (a host gets blocked), not just printed text.

Attack chain (matches the guide's APT28 stage list):
    1. Reconnaissance          T1592 / T1590
    2. Initial Access          T1566.001 (Spearphishing Attachment)
    3. Credential Access       T1003 (OS Credential Dumping)
    4. Lateral Movement        T1021.002 (SMB/Windows Admin Shares)
    5. Persistence             T1053.005 (Scheduled Task)
    6. Exfiltration            T1041 (Exfiltration Over C2 Channel)

Usage:
    python apt_campaign.py --run                      # run against localhost SDN API
    python apt_campaign.py --run --target ENER-SRV1    # choose target host
    python apt_campaign.py --run --sdn-url http://<ip>:8000
"""

import argparse
import json
import os
import time
from datetime import datetime, timezone

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SDN_URL = "http://localhost:3001"
LOG_PATH = os.path.join(BASE_DIR, "apt_campaign_log.json")

ATTACK_STAGES = [
    {
        "stage": 1,
        "name": "Reconnaissance",
        "attack_id": "T1592",
        "technique_name": "Gather Victim Host Information",
        "action": "recon",
    },
    {
        "stage": 2,
        "name": "Initial Access",
        "attack_id": "T1566.001",
        "technique_name": "Spearphishing Attachment",
        "action": "initial_access",
    },
    {
        "stage": 3,
        "name": "Credential Access",
        "attack_id": "T1003",
        "technique_name": "OS Credential Dumping",
        "action": "credential_access",
    },
    {
        "stage": 4,
        "name": "Lateral Movement",
        "attack_id": "T1021.002",
        "technique_name": "SMB/Windows Admin Shares",
        "action": "lateral_movement",
    },
    {
        "stage": 5,
        "name": "Persistence",
        "attack_id": "T1053.005",
        "technique_name": "Scheduled Task",
        "action": "persistence",
    },
    {
        "stage": 6,
        "name": "Exfiltration",
        "attack_id": "T1041",
        "technique_name": "Exfiltration Over C2 Channel",
        "action": "exfiltration",
        "sdn_effect": "block",  # this stage triggers a REAL SDN block call
    },
]


class APTCampaign:
    """
    Runs a staged, MITRE-ATT&CK-mapped attack chain. Where a stage has a
    real network-level effect, it calls the live SDN controller (Member 1)
    so the campaign produces an actual, verifiable change in the
    simulation, not just log lines.
    """

    def __init__(self, sdn_url: str = DEFAULT_SDN_URL, target: str = "ENER-SRV1"):
        self.sdn_url = sdn_url.rstrip("/")
        self.target = target
        self.log = []

    def _record(self, stage: dict, result: str, detail: str = ""):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": stage["stage"],
            "name": stage["name"],
            "attack_id": stage["attack_id"],
            "technique_name": stage["technique_name"],
            "target": self.target,
            "result": result,
            "detail": detail,
        }
        self.log.append(entry)
        print(f"[Stage {stage['stage']}/{len(ATTACK_STAGES)}] {stage['name']} "
              f"({stage['attack_id']}) -> {result} {detail}")

    def _call_sdn_block(self):
        """Actually blocks the target host via Member 1's live SDN API."""
        try:
            r = requests.post(
                f"{self.sdn_url}/block-host",
                json={"node_id": self.target},
                timeout=10,
            )
            if r.status_code == 200:
                return "sdn_block_success", json.dumps(r.json())
            return "sdn_block_failed", f"HTTP {r.status_code}"
        except requests.RequestException as e:
            return "sdn_unreachable", str(e)

    def _verify_path_blocked(self, src: str = "GOVE-PC1"):
        """Confirms the block actually took effect by checking reachability."""
        try:
            r = requests.get(
                f"{self.sdn_url}/path",
                params={"src": src, "dst": self.target},
                timeout=10,
            )
            data = r.json()
            return data
        except requests.RequestException as e:
            return {"error": str(e)}

    def run(self, delay_seconds: float = 1.0):
        print(f"Starting APT28-style campaign against target: {self.target}")
        print(f"SDN controller: {self.sdn_url}\n")

        for stage in ATTACK_STAGES:
            time.sleep(delay_seconds)  # pacing, so it reads like a real campaign timeline

            if stage.get("sdn_effect") == "block":
                result, detail = self._call_sdn_block()
                self._record(stage, result, detail)

                if result == "sdn_block_success":
                    verify = self._verify_path_blocked()
                    reachable = verify.get("reachable", "unknown")
                    print(f"    Verification: path now reachable={reachable}")
            else:
                # Non-network stages: simulated (credential access, persistence,
                # etc. have no observable effect on Member 1's SDN-level topology,
                # same as the real guide treats them as CALDERA "abilities" with
                # local, per-host effects we don't have real hosts to run on).
                self._record(stage, "simulated", "no direct SDN-observable effect")

        self._save_log()
        print(f"\nCampaign complete. {len(self.log)} stages executed. "
              f"Log saved to {LOG_PATH}")

    def _save_log(self):
        with open(LOG_PATH, "w") as f:
            json.dump(self.log, f, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--target", default="ENER-SRV1", help="Target host/node ID")
    parser.add_argument("--sdn-url", default=DEFAULT_SDN_URL)
    parser.add_argument("--delay", type=float, default=1.0,
                         help="Seconds between stages (for a readable demo pace)")
    args = parser.parse_args()

    if args.run:
        campaign = APTCampaign(sdn_url=args.sdn_url, target=args.target)
        campaign.run(delay_seconds=args.delay)
    else:
        parser.print_help()