"""
soar.py
-------
ACDSF Member 3 — Autonomous SOC / SOAR (lightweight)

Standardized replacement for TheHive, which needs Cassandra + Elasticsearch
+ its own service running simultaneously — too heavy for an 8GB laptop
alongside everything else already running.

Instead: a real incident case-management system backed by SQLite (same
pattern as threat_intel.py), with the SAME core SOAR concept as the
guide's step — an automated playbook that, when triggered, takes real
containment action (via your real SDN controller) AND creates a real,
queryable incident case record with a full audit trail of what was done
and when.

Usage:
    python soar.py --init                                   # create the case DB
    python soar.py --trigger-playbook --target ENER-SRV1     # run the DDoS-style
                                                                containment playbook
    python soar.py --serve                                   # REST API on port 9000
    python soar.py --list                                    # list all cases
"""

import argparse
import json
import sqlite3
import time
import os
from datetime import datetime, timezone

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Use absolute path based on script location to avoid working directory issues
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "soar_cases.db")
SDN_URL = "http://localhost:8000"


def init_db(path: str = DB_PATH):
    conn = sqlite3.connect(path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            severity INTEGER,
            status TEXT DEFAULT 'open',
            target TEXT,
            created_at TEXT,
            resolved_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS case_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER,
            action TEXT,
            result TEXT,
            timestamp TEXT,
            FOREIGN KEY(case_id) REFERENCES cases(id)
        )
    """)
    conn.commit()
    return conn


def _now():
    return datetime.now(timezone.utc).isoformat()


def create_case(conn, title: str, description: str, severity: int, target: str) -> int:
    cur = conn.execute(
        "INSERT INTO cases (title, description, severity, target, created_at) VALUES (?,?,?,?,?)",
        (title, description, severity, target, _now()),
    )
    conn.commit()
    return cur.lastrowid


def log_action(conn, case_id: int, action: str, result: str):
    conn.execute(
        "INSERT INTO case_actions (case_id, action, result, timestamp) VALUES (?,?,?,?)",
        (case_id, action, result, _now()),
    )
    conn.commit()


def resolve_case(conn, case_id: int):
    conn.execute(
        "UPDATE cases SET status='resolved', resolved_at=? WHERE id=?",
        (_now(), case_id),
    )
    conn.commit()


def run_ddos_playbook(target: str, sdn_url: str = SDN_URL) -> int:
    """
    Real automated response playbook, matching the guide's DDoS response
    design: block the target via the live SDN controller, create a real
    incident case with a full action log, and mark it resolved once the
    block is confirmed. Returns the case ID.
    """
    # Validate target to prevent injection and abuse
    if not target or len(target) > 100:
        raise ValueError("Invalid target: must be non-empty and <= 100 characters")
    if not all(c.isalnum() or c in '-_.' for c in target):
        raise ValueError("Invalid target: only alphanumeric, dash, underscore, and dot allowed")
    
    conn = init_db()
    print(f"PLAYBOOK TRIGGERED: containment response for {target}")

    case_id = create_case(
        conn,
        title=f"Automated containment: {target}",
        description=f"Suspicious activity detected on {target}. "
                     f"Automated SOAR playbook triggered.",
        severity=3,
        target=target,
    )
    print(f"  Case #{case_id} created")

    try:
        r = requests.post(f"{sdn_url}/block-host", json={"node_id": target}, timeout=10)
        r.raise_for_status()  # Raise exception for HTTP errors (4xx, 5xx)
        try:
            result = r.json()
        except json.JSONDecodeError as e:
            result = {"error": f"Invalid JSON response from SDN: {str(e)}"}
            block_ok = False
        else:
            block_ok = result.get("status") == "blocked"
    except requests.exceptions.HTTPError as e:
        result = {"error": f"SDN HTTP error: {str(e)}"}
        block_ok = False
    except requests.RequestException as e:
        result = {"error": f"SDN connection error: {str(e)}"}
        block_ok = False

    log_action(conn, case_id, "block_host", json.dumps(result))
    print(f"  Action logged: block_host -> {result}")

    if block_ok:
        log_action(conn, case_id, "verify_containment", "verified via SDN block confirmation")
        resolve_case(conn, case_id)
        print(f"  Case #{case_id} resolved (containment confirmed)")
    else:
        log_action(conn, case_id, "verify_containment", "FAILED - manual review needed")
        print(f"  Case #{case_id} left OPEN — block did not succeed, needs manual review")

    conn.close()
    return case_id


def list_cases(path: str = DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cases = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    for c in cases:
        print(f"#{c['id']} [{c['status']}] {c['title']} (severity {c['severity']}, target={c['target']})")
        actions = conn.execute(
            "SELECT * FROM case_actions WHERE case_id=? ORDER BY timestamp", (c["id"],)
        ).fetchall()
        for a in actions:
            print(f"    - {a['timestamp']}: {a['action']} -> {a['result']}")
    conn.close()


# ---------------------------------------------------------------
# REST API
# ---------------------------------------------------------------
app = FastAPI(title="ACDSF SOAR API (lightweight)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])


class PlaybookRequest(BaseModel):
    target: str


@app.post("/playbook/ddos-response")
def trigger_playbook(req: PlaybookRequest):
    case_id = run_ddos_playbook(req.target)
    return {"case_id": case_id, "status": "playbook executed"}


@app.get("/cases")
def get_cases():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/cases/{case_id}")
def get_case(case_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    case = conn.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    actions = conn.execute(
        "SELECT * FROM case_actions WHERE case_id=? ORDER BY timestamp", (case_id,)
    ).fetchall()
    conn.close()
    return {"case": dict(case), "actions": [dict(a) for a in actions]}


@app.get("/health")
def health():
    conn = sqlite3.connect(DB_PATH)
    total = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    conn.close()
    return {"status": "ok", "total_cases": total}


def run_server(host: str = "127.0.0.1", port: int = 9000):
    """Run the SOAR API server.
    
    Args:
        host: Server host (default 127.0.0.1 for localhost only; use 0.0.0.0 with caution)
        port: Server port (default 9000)
    """
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", action="store_true", help="Initialize the case database")
    parser.add_argument("--trigger-playbook", action="store_true", help="Trigger the DDoS containment playbook")
    parser.add_argument("--target", default="ENER-SRV1", help="Target node ID for containment")
    parser.add_argument("--sdn-url", default=SDN_URL, help="SDN controller URL")
    parser.add_argument("--serve", action="store_true", help="Start the REST API server")
    parser.add_argument("--host", default="127.0.0.1", help="Server host (default: localhost only)")
    parser.add_argument("--port", type=int, default=9000, help="Server port (default: 9000)")
    parser.add_argument("--list", action="store_true", help="List all cases")
    args = parser.parse_args()

    if args.init:
        init_db()
        print(f"Initialized {DB_PATH}")
    elif args.trigger_playbook:
        try:
            run_ddos_playbook(args.target, sdn_url=args.sdn_url)
        except ValueError as e:
            print(f"ERROR: {e}", file=__import__('sys').stderr)
            exit(1)
    elif args.serve:
        init_db()
        print(f"Starting SOAR API on {args.host}:{args.port}")
        print(f"Cases database: {DB_PATH}")
        run_server(host=args.host, port=args.port)
    elif args.list:
        list_cases()
    else:
        parser.print_help()