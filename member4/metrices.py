"""
metrics.py
----------
ACDSF Member 4 — Evaluation Framework (KPIs)

Standardized replacement for the guide's InfluxDB + Flux query metrics
pipeline. Rather than standing up another database server, this computes
REAL KPIs directly from the actual log files and databases your other
three members' scripts already produce:

  - soar_cases.db       (Member 3's soar.py)          -> containment timing, success rate
  - selfplay_log.json   (Member 3's selfplay_runner.py)-> red/blue outcome rates
  - apt_campaign_log.json (Member 2's apt_campaign.py) -> attack chain timing/coverage

These are genuine numbers from genuine runs you've already produced and
verified — not simulated Flux query results. Run each source script at
least once before running this (or point --dir at wherever they live).

Usage:
    python metrics.py --dir C:\\Users\\thris\\ACDSF\\member3
"""

import argparse
import json
import os
import sqlite3
from datetime import datetime


def _parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def soar_metrics(db_path: str):
    """
    MTTR proxy: real elapsed time between a SOAR case being created and
    resolved, averaged across all resolved cases in your real case DB.
    Containment success rate: resolved / total cases.
    """
    if not os.path.exists(db_path):
        return None
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cases = conn.execute("SELECT * FROM cases").fetchall()
    conn.close()

    if not cases:
        return {"total_cases": 0}

    resolved = [c for c in cases if c["status"] == "resolved" and c["resolved_at"]]
    mttrs = []
    for c in resolved:
        created = _parse_ts(c["created_at"])
        finished = _parse_ts(c["resolved_at"])
        mttrs.append((finished - created).total_seconds())

    return {
        "total_cases": len(cases),
        "resolved_cases": len(resolved),
        "containment_success_rate_pct": round(100 * len(resolved) / len(cases), 1),
        "mean_mttr_seconds": round(sum(mttrs) / len(mttrs), 3) if mttrs else None,
    }


def selfplay_metrics(log_path: str):
    """
    Real red-success rate and blue-correct-response rate from your actual
    self-play rounds — genuine outcomes from your trained agents acting
    against your real SDN controller.
    """
    if not os.path.exists(log_path):
        return None
    with open(log_path) as f:
        rounds = json.load(f)

    if not rounds:
        return {"total_rounds": 0}

    red_success = sum(1 for r in rounds if r["red"]["succeeded"])
    blue_correct = sum(1 for r in rounds if r["blue"]["correct"])
    blue_wins = sum(1 for r in rounds if r["winner"] == "BLUE")

    return {
        "total_rounds": len(rounds),
        "red_attack_success_rate_pct": round(100 * red_success / len(rounds), 1),
        "blue_correct_response_rate_pct": round(100 * blue_correct / len(rounds), 1),
        "blue_win_rate_pct": round(100 * blue_wins / len(rounds), 1),
        "mean_red_reward": round(sum(r["red"]["reward"] for r in rounds) / len(rounds), 2),
        "mean_blue_reward": round(sum(r["blue"]["reward"] for r in rounds) / len(rounds), 2),
    }


def apt_campaign_metrics(log_path: str):
    """
    Real attack-chain timing and MITRE ATT&CK stage coverage from your
    actual campaign run.
    """
    if not os.path.exists(log_path):
        return None
    with open(log_path) as f:
        stages = json.load(f)

    if not stages:
        return {"total_stages": 0}

    start = _parse_ts(stages[0]["timestamp"])
    end = _parse_ts(stages[-1]["timestamp"])
    technique_ids = [s["attack_id"] for s in stages]

    return {
        "total_stages": len(stages),
        "campaign_duration_seconds": round((end - start).total_seconds(), 3),
        "mitre_technique_ids_covered": technique_ids,
        "final_stage_result": stages[-1]["result"],
    }


def print_kpi_report(base_dir: str):
    soar_path = os.path.join(base_dir, "soar_cases.db")
    selfplay_path = os.path.join(base_dir, "selfplay_log.json")
    apt_path = os.path.join(base_dir, "apt_campaign_log.json")

    print("=" * 60)
    print(f"ACDSF KPI REPORT - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    soar = soar_metrics(soar_path)
    print("\n[SOAR / Containment Metrics] (from soar_cases.db)")
    if soar is None:
        print("  Not found — run soar.py --trigger-playbook first")
    else:
        for k, v in soar.items():
            print(f"  {k}: {v}")

    sp = selfplay_metrics(selfplay_path)
    print("\n[Self-Play Red/Blue Metrics] (from selfplay_log.json)")
    if sp is None:
        print("  Not found — run selfplay_runner.py first")
    else:
        for k, v in sp.items():
            print(f"  {k}: {v}")

    apt = apt_campaign_metrics(apt_path)
    print("\n[APT Campaign Metrics] (from apt_campaign_log.json)")
    if apt is None:
        print("  Not found — run apt_campaign.py --run first")
    else:
        for k, v in apt.items():
            print(f"  {k}: {v}")

    print("=" * 60)

    report = {"soar": soar, "selfplay": sp, "apt_campaign": apt,
              "generated_at": datetime.now().isoformat()}
    out_path = os.path.join(base_dir, "kpi_report.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Saved full report to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default=".",
                         help="Directory containing soar_cases.db, selfplay_log.json, apt_campaign_log.json")
    args = parser.parse_args()

    print_kpi_report(args.dir)