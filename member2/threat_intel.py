"""
threat_intel.py
----------------
ACDSF Member 2 — Threat Intelligence Platform (lightweight)

Standardized replacement for MISP + OpenCTI, which together need 4GB+ RAM
and multiple Docker containers (Elasticsearch, RabbitMQ, Redis, MinIO, MySQL)
just to run.

Instead of standing up those servers, this module:
  1. Pulls REAL, current threat intel from Abuse.ch's free public feeds
     (URLhaus + MalwareBazaar/ThreatFox) — the SAME feeds the guide's MISP
     step configures — no API key required for these two.
  2. Stores IOCs (Indicators of Compromise) locally in SQLite, using the
     same field structure MISP uses internally (event, IOC type, value,
     first_seen, tags).
  3. Exposes a small REST API (port 8003) so other modules (KG, red agent,
     dashboard) can query it, matching how a real threat-intel platform
     is consumed downstream.

Usage:
    python threat_intel.py --fetch          # pull real IOCs, store locally
    python threat_intel.py --serve          # start REST API on port 8003
"""

import argparse
import csv
import io
import sqlite3
import time
import requests
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = "threat_intel.db"

# Real, free, no-auth-required threat feeds (same providers the original
# guide's MISP feed configuration step points at)
URLHAUS_RECENT = "https://urlhaus.abuse.ch/downloads/csv_recent/"
THREATFOX_RECENT = "https://threatfox.abuse.ch/export/csv/recent/"


def init_db(path: str = DB_PATH):
    conn = sqlite3.connect(path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS iocs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            ioc_type TEXT NOT NULL,
            value TEXT NOT NULL,
            threat_tag TEXT,
            first_seen TEXT,
            fetched_at INTEGER,
            UNIQUE(source, value)
        )
    """)
    conn.commit()
    return conn


def fetch_urlhaus(conn):
    """Pulls real recent malicious URLs from URLhaus (abuse.ch).

    Real columns: id, dateadded, url, url_status, last_online, threat,
    tags, urlhaus_link, reporter
    """
    print("Fetching URLhaus recent malicious URLs...")
    resp = requests.get(URLHAUS_RECENT, timeout=30)
    text_lines = [l for l in resp.text.splitlines() if l and not l.startswith("#")]
    reader = csv.reader(text_lines)  # correctly handles quoted commas
    count = 0
    for parts in list(reader)[:200]:  # cap for a quick, RAM-friendly demo dataset
        if len(parts) < 6:
            continue
        _id, dateadded, url, url_status, _last_online, threat = parts[:6]
        try:
            conn.execute(
                "INSERT OR IGNORE INTO iocs (source, ioc_type, value, threat_tag, first_seen, fetched_at) "
                "VALUES (?,?,?,?,?,?)",
                ("URLhaus", "url", url, threat, dateadded, int(time.time())),
            )
            count += 1
        except sqlite3.Error:
            continue
    conn.commit()
    print(f"  Stored {count} URLhaus IOCs")


def fetch_threatfox(conn):
    """Pulls real recent IOCs (IPs, domains, hashes) from ThreatFox (abuse.ch).

    Real columns: id, first_seen_utc, ioc, ioc_type, threat_type, fk_malware,
    malware_alias, malware_printable, confidence_level, reference, tags,
    anonymous, reporter
    """
    print("Fetching ThreatFox recent IOCs...")
    resp = requests.get(THREATFOX_RECENT, timeout=30)
    text_lines = [l for l in resp.text.splitlines() if l and not l.startswith("#")]
    reader = csv.reader(text_lines)
    count = 0
    for parts in list(reader)[:200]:
        if len(parts) < 5:
            continue
        _id, first_seen, ioc_value, ioc_type, threat_type = parts[:5]
        try:
            conn.execute(
                "INSERT OR IGNORE INTO iocs (source, ioc_type, value, threat_tag, first_seen, fetched_at) "
                "VALUES (?,?,?,?,?,?)",
                ("ThreatFox", ioc_type, ioc_value, threat_type, first_seen, int(time.time())),
            )
            count += 1
        except sqlite3.Error:
            continue
    conn.commit()
    print(f"  Stored {count} ThreatFox IOCs")


def fetch_all():
    conn = init_db()
    try:
        fetch_urlhaus(conn)
    except Exception as e:
        print(f"  URLhaus fetch failed ({e}) — continuing")
    try:
        fetch_threatfox(conn)
    except Exception as e:
        print(f"  ThreatFox fetch failed ({e}) — continuing")

    total = conn.execute("SELECT COUNT(*) FROM iocs").fetchone()[0]
    by_source = conn.execute(
        "SELECT source, COUNT(*) FROM iocs GROUP BY source"
    ).fetchall()
    print(f"\nTotal IOCs stored: {total}")
    for src, cnt in by_source:
        print(f"  {src}: {cnt}")
    conn.close()


# ---------------------------------------------------------------
# REST API
# ---------------------------------------------------------------
app = FastAPI(title="ACDSF Threat Intel API (lightweight)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])


@app.get("/iocs")
def list_iocs(limit: int = 50, ioc_type: str = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if ioc_type:
        rows = conn.execute(
            "SELECT * FROM iocs WHERE ioc_type = ? ORDER BY fetched_at DESC LIMIT ?",
            (ioc_type, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM iocs ORDER BY fetched_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/iocs/search")
def search_ioc(value: str):
    """Check if a given IP/domain/URL/hash matches a known IOC."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM iocs WHERE value LIKE ?", (f"%{value}%",)
    ).fetchall()
    conn.close()
    return {"query": value, "matches": [dict(r) for r in rows]}


@app.get("/health")
def health():
    conn = sqlite3.connect(DB_PATH)
    total = conn.execute("SELECT COUNT(*) FROM iocs").fetchone()[0]
    conn.close()
    return {"status": "ok", "total_iocs": total}


def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8003)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--serve", action="store_true")
    args = parser.parse_args()

    if args.fetch:
        fetch_all()
    elif args.serve:
        run_server()
    else:
        parser.print_help()