"""
ACDSF — Thread-Safe Database Layer
=====================================
Context-managed SQLite connections with WAL mode, timeouts,
consistent row factories, and automatic cleanup.

Usage:
    from database import get_db, init_db

    with get_db() as conn:
        rows = conn.execute("SELECT * FROM twins").fetchall()
"""

import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

logger = logging.getLogger("acdsf.database")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "digital_twin.db")

_DB_TIMEOUT = 30  # seconds — prevents deadlocks under concurrent threads


@contextmanager
def get_db(path: str = DB_PATH):
    """
    Yield a thread-safe SQLite connection with:
      - WAL journal mode (concurrent readers, single writer)
      - 10-second busy timeout (avoids immediate SQLITE_BUSY errors)
      - Row factory set to sqlite3.Row for dict-like access
      - Automatic commit on success, rollback on exception, close always
    """
    conn = None
    try:
        conn = sqlite3.connect(path, timeout=_DB_TIMEOUT)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
        conn.commit()
    except sqlite3.Error:
        if conn is not None:
            conn.rollback()
        raise
    finally:
        if conn is not None:
            conn.close()


def init_db(topology_path: str | None = None):
    """
    Initialise the database schema (idempotent).
    Creates 'twins' and 'users' tables, and optionally seeds topology.
    """
    topo_path = topology_path or os.path.join(BASE_DIR, "topology.json")

    try:
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS twins (
                    node_id       TEXT PRIMARY KEY,
                    sector        TEXT,
                    node_type     TEXT,
                    cpu_load      REAL    DEFAULT 0,
                    is_compromised INTEGER DEFAULT 0,
                    alert_count   INTEGER DEFAULT 0,
                    last_updated  TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name     TEXT,
                    username      TEXT UNIQUE NOT NULL,
                    email         TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    role          TEXT DEFAULT 'analyst',
                    created_at    TEXT,
                    last_login    TEXT
                )
            """)

            # Add full_name column to existing tables (idempotent migration)
            try:
                conn.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
            except Exception:
                pass  # Column already exists
            conn.execute("UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = ''")

            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id    INTEGER,
                    user_email TEXT,
                    action     TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    details    TEXT,
                    created_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    email      TEXT NOT NULL,
                    token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    used       INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS otp_sessions (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier    TEXT NOT NULL,
                    otp_hash      TEXT NOT NULL,
                    channel       TEXT DEFAULT 'email',
                    created_at    TEXT NOT NULL,
                    expires_at    TEXT NOT NULL,
                    attempts      INTEGER DEFAULT 0,
                    used          INTEGER DEFAULT 0
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS otp_rate_limit (
                    identifier    TEXT PRIMARY KEY,
                    request_count INTEGER DEFAULT 0,
                    window_start  TEXT NOT NULL
                )
            """)

            # Incident lifecycle table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    incident_id          TEXT PRIMARY KEY,
                    attack_type          TEXT,
                    source               TEXT DEFAULT 'Red Team',
                    target               TEXT,
                    status               TEXT DEFAULT 'CREATED',
                    final_status         TEXT,
                    attack_started_at    TEXT,
                    attack_detected_at   TEXT,
                    attack_ended_at      TEXT,
                    duration_seconds     REAL,
                    detection_status     TEXT,
                    confidence_score     REAL,
                    severity             TEXT,
                    risk_score           INTEGER,
                    risk_level           TEXT,
                    mitre_tactic         TEXT,
                    mitre_technique_id   TEXT,
                    mitre_technique_name TEXT,
                    key_indicators       TEXT,
                    blue_team_response   TEXT,
                    notification_status  TEXT,
                    created_at           TEXT,
                    updated_at           TEXT
                )
            """)

            # FCM device tokens
            conn.execute("""
                CREATE TABLE IF NOT EXISTS device_tokens (
                    token         TEXT PRIMARY KEY,
                    registered_at TEXT
                )
            """)

            # Central SOC notifications table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id            INTEGER,
                    type               TEXT NOT NULL,
                    severity           TEXT NOT NULL,
                    title              TEXT NOT NULL,
                    message            TEXT NOT NULL,
                    attack_id          TEXT,
                    mitre_technique_id TEXT,
                    source_node        TEXT,
                    target_node        TEXT,
                    is_read            INTEGER DEFAULT 0,
                    created_at         TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(is_read, created_at DESC)")

            # Email delivery audit log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS email_logs (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id        TEXT,
                    recipient          TEXT NOT NULL,
                    subject            TEXT NOT NULL,
                    status             TEXT NOT NULL,
                    attempts           INTEGER DEFAULT 1,
                    error              TEXT,
                    created_at         TEXT NOT NULL
                )
            """)
            try:
                conn.execute("ALTER TABLE email_logs ADD COLUMN incident_id TEXT")
            except Exception:
                pass  # column already exists
            conn.execute("CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC)")

            # SMS delivery audit log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sms_logs (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id        TEXT,
                    recipient          TEXT NOT NULL,
                    message            TEXT NOT NULL,
                    status             TEXT NOT NULL,
                    provider           TEXT NOT NULL,
                    attempts           INTEGER DEFAULT 1,
                    error              TEXT,
                    created_at         TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC)")

            # User notification preferences
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_settings (
                    user_id            INTEGER PRIMARY KEY,
                    email_enabled      INTEGER DEFAULT 1,
                    sound_enabled      INTEGER DEFAULT 1,
                    desktop_enabled    INTEGER DEFAULT 1,
                    min_severity       TEXT DEFAULT 'medium',
                    updated_at         TEXT NOT NULL
                )
            """)

            # Multi-agent simulation runs
            conn.execute("""
                CREATE TABLE IF NOT EXISTS simulations (
                    simulation_id      TEXT PRIMARY KEY,
                    scenario           TEXT,
                    total_rounds       INTEGER,
                    speed              REAL,
                    target_sector      TEXT,
                    red_difficulty     TEXT,
                    blue_mode          TEXT,
                    status             TEXT,
                    started_at         TEXT,
                    ended_at           TEXT,
                    winner             TEXT,
                    red_wins           INTEGER DEFAULT 0,
                    blue_wins          INTEGER DEFAULT 0,
                    red_reward         REAL DEFAULT 0,
                    blue_reward        REAL DEFAULT 0,
                    stages_completed   INTEGER DEFAULT 0,
                    nodes_compromised  INTEGER DEFAULT 0,
                    detection_rate     REAL DEFAULT 0,
                    mttd               REAL DEFAULT 0,
                    mttr               REAL DEFAULT 0,
                    results_json       TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sim_started ON simulations(started_at DESC)")

            # Detailed round events per simulation
            conn.execute("""
                CREATE TABLE IF NOT EXISTS simulation_events (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    simulation_id      TEXT NOT NULL,
                    round              INTEGER NOT NULL,
                    winner             TEXT,
                    red_reward         REAL,
                    blue_reward        REAL,
                    red_technique      TEXT,
                    blue_action        TEXT,
                    target_node        TEXT,
                    detected           INTEGER,
                    red_success        INTEGER,
                    timestamp          TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sim_events ON simulation_events(simulation_id, round)")

            if os.path.exists(topo_path):
                import json
                with open(topo_path, "r", encoding="utf-8") as f:
                    topo = json.load(f)
                for node in topo.get("nodes", []):
                    conn.execute(
                        "INSERT OR IGNORE INTO twins "
                        "(node_id, sector, node_type, last_updated) "
                        "VALUES (?, ?, ?, ?)",
                        (
                            node["id"],
                            node.get("sector", "backbone"),
                            node.get("type", "unknown"),
                            datetime.utcnow().isoformat(),
                        ),
                    )
        logger.info("Database initialised at %s", DB_PATH)
    except Exception:
        logger.exception("Failed to initialise database")
        raise
