"""
digital_twin.py
------------------
Member 1, Step 3 equivalent: a live "digital twin" tracking the real-time
state of every node in the network (CPU load, compromised status, alert
count) - same role as Eclipse Ditto in the original guide, but a plain
Flask + SQLite service, so there's no extra Docker container to run.

Endpoints match the same shape as the original Ditto REST API so the rest
of your pipeline (blue-team agent, dashboard) can query it the same way:
    GET  /twins                  -> all node states
    GET  /twins/<node_id>        -> one node's state
    PUT  /twins/<node_id>        -> update a node's state
    POST /twins/<node_id>/compromise  -> mark a node compromised (for demos)

Install: pip install flask
Run:     python digital_twin.py
Then:    http://localhost:5000/twins
"""

from flask import Flask, jsonify, request
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)
DB_PATH = "digital_twin.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS twins (
            node_id TEXT PRIMARY KEY,
            sector TEXT,
            node_type TEXT,
            cpu_load REAL DEFAULT 0,
            is_compromised INTEGER DEFAULT 0,
            alert_count INTEGER DEFAULT 0,
            last_updated TEXT
        )
    """)
    conn.commit()
    conn.close()


def seed_from_topology(topology_json_path: str = "topology.json"):
    """Populates the digital twin DB with every node from network_topology.py's output."""
    with open(topology_json_path) as f:
        topo = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    for node in topo["nodes"]:
        conn.execute(
            "INSERT OR IGNORE INTO twins (node_id, sector, node_type, last_updated) VALUES (?, ?, ?, ?)",
            (node["id"], node.get("sector", "backbone"), node.get("type", "unknown"),
             datetime.utcnow().isoformat())
        )
    conn.commit()
    conn.close()
    print(f"Seeded digital twin with {len(topo['nodes'])} nodes from {topology_json_path}")


@app.route("/twins", methods=["GET"])
def get_all_twins():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM twins").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/twins/<node_id>", methods=["GET"])
def get_twin(node_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM twins WHERE node_id = ?", (node_id,)).fetchone()
    conn.close()
    if row is None:
        return jsonify({"error": "Node not found"}), 404
    return jsonify(dict(row))


@app.route("/twins/<node_id>", methods=["PUT"])
def update_twin(node_id):
    data = request.json or {}
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE twins SET cpu_load=?, is_compromised=?, alert_count=?, last_updated=? WHERE node_id=?",
        (data.get("cpu_load", 0), int(data.get("is_compromised", 0)),
         data.get("alert_count", 0), datetime.utcnow().isoformat(), node_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "updated", "node_id": node_id})


@app.route("/twins/<node_id>/compromise", methods=["POST"])
def compromise_node(node_id):
    """Quick demo endpoint - mark a node as compromised, useful for testing the pipeline
    and dashboards without needing a real attack running."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE twins SET is_compromised=1, alert_count=alert_count+1, last_updated=? WHERE node_id=?",
        (datetime.utcnow().isoformat(), node_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "compromised", "node_id": node_id})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "Digital Twin service running"})


if __name__ == "__main__":
    init_db()
    try:
        seed_from_topology()
    except FileNotFoundError:
        print("topology.json not found - run network_topology.py first to generate it.")
    app.run(host="127.0.0.1", port=5000, debug=False)
