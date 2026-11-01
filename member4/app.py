from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import os
import networkx as nx
from datetime import datetime

app = Flask(__name__)
CORS(app)  # allows your Vercel/Netlify-hosted frontend to call this API

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOPOLOGY_PATH = os.path.join(BASE_DIR, "topology.json")
KG_PATH = os.path.join(BASE_DIR, "knowledge_graph.gpickle.json")
DB_PATH = os.path.join(BASE_DIR, "digital_twin.db")

# ---------------------------------------------------------------------
# Shared state, loaded once at startup
# ---------------------------------------------------------------------
sdn_graph = None          # live, mutable copy for block/restore
removed_edges = {}        # node_id -> removed edges, for restore
kg_graph = None           # knowledge graph, read-only


def _load_graph_compat(data, **kwargs):
    """Different NetworkX versions save/expect the edge list under different
    keys ('links' in older versions like 3.1, 'edges' in 3.6+) and older
    versions don't even accept the 'edges=' kwarg to specify it. This handles
    both directions so the same file loads correctly regardless of which
    NetworkX version is installed (e.g. your dev machine vs PythonAnywhere)."""
    try:
        edge_key = "edges" if "edges" in data else "links"
        return nx.node_link_graph(data, edges=edge_key, **kwargs)
    except TypeError:
        # older NetworkX: no 'edges' kwarg support, always expects 'links'
        data = dict(data)
        if "edges" in data and "links" not in data:
            data["links"] = data.pop("edges")
        return nx.node_link_graph(data, **kwargs)


def load_sdn_graph():
    global sdn_graph
    with open(TOPOLOGY_PATH) as f:
        data = json.load(f)
    sdn_graph = _load_graph_compat(data)


def load_kg_graph():
    global kg_graph
    if os.path.exists(KG_PATH):
        with open(KG_PATH) as f:
            data = json.load(f)
        kg_graph = _load_graph_compat(data, multigraph=True, directed=True)
    else:
        kg_graph = nx.MultiDiGraph()  # empty fallback so the app still starts


def init_twin_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS twins (
            node_id TEXT PRIMARY KEY, sector TEXT, node_type TEXT,
            cpu_load REAL DEFAULT 0, is_compromised INTEGER DEFAULT 0,
            alert_count INTEGER DEFAULT 0, last_updated TEXT
        )
    """)
    conn.commit()
    if os.path.exists(TOPOLOGY_PATH):
        with open(TOPOLOGY_PATH) as f:
            topo = json.load(f)
        for node in topo["nodes"]:
            conn.execute(
                "INSERT OR IGNORE INTO twins (node_id, sector, node_type, last_updated) VALUES (?, ?, ?, ?)",
                (node["id"], node.get("sector", "backbone"), node.get("type", "unknown"),
                 datetime.utcnow().isoformat())
            )
        conn.commit()
    conn.close()


# ---------------------------------------------------------------------
# /twins/* — Digital Twin endpoints
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# /sdn/* — SDN Controller endpoints
# ---------------------------------------------------------------------
@app.route("/sdn/topology", methods=["GET"])
def get_topology():
    return jsonify(nx.node_link_data(sdn_graph))


@app.route("/sdn/block-host", methods=["POST"])
def block_host():
    node_id = request.json.get("node_id")
    if node_id not in sdn_graph:
        return jsonify({"error": f"Node {node_id} not in topology"}), 404
    edges = list(sdn_graph.edges(node_id, data=True))
    removed_edges[node_id] = edges
    sdn_graph.remove_edges_from([(u, v) for u, v, d in edges])
    return jsonify({"status": "blocked", "node_id": node_id, "edges_removed": len(edges)})


@app.route("/sdn/restore-host", methods=["POST"])
def restore_host():
    node_id = request.json.get("node_id")
    if node_id not in removed_edges:
        return jsonify({"error": f"No block record for {node_id}"}), 404
    sdn_graph.add_edges_from([(u, v, d) for u, v, d in removed_edges[node_id]])
    del removed_edges[node_id]
    return jsonify({"status": "restored", "node_id": node_id})


@app.route("/sdn/path", methods=["GET"])
def get_path():
    src, dst = request.args.get("src"), request.args.get("dst")
    if src not in sdn_graph or dst not in sdn_graph:
        return jsonify({"error": "Unknown node"}), 404
    try:
        path = nx.shortest_path(sdn_graph, src, dst, weight="latency_ms")
        latency = nx.shortest_path_length(sdn_graph, src, dst, weight="latency_ms")
        return jsonify({"path": path, "latency_ms": latency, "reachable": True})
    except nx.NetworkXNoPath:
        return jsonify({"reachable": False, "reason": "No path - host may be blocked"})


# ---------------------------------------------------------------------
# /kg/* — Knowledge Graph endpoints
# ---------------------------------------------------------------------
@app.route("/kg/attack-paths/<sector>", methods=["GET"])
def get_attack_paths(sector):
    results = []
    assets_in_sector = [n for n, d in kg_graph.nodes(data=True)
                         if d.get("kind") == "Asset" and d.get("sector") == sector]
    for asset in assets_in_sector:
        for tech_node in kg_graph.predecessors(asset):
            tdata = kg_graph.nodes[tech_node]
            if tdata.get("kind") != "Technique":
                continue
            for actor_node in kg_graph.predecessors(tech_node):
                adata = kg_graph.nodes[actor_node]
                if adata.get("kind") == "ThreatActor":
                    results.append({
                        "actor": adata["name"], "technique_id": tdata["attack_id"],
                        "technique_name": tdata["name"], "tactic": tdata["tactic"],
                    })
    return jsonify(results)


@app.route("/kg/asset-risk/<hostname>", methods=["GET"])
def get_asset_risk(hostname):
    node_id = f"asset:{hostname}"
    if not kg_graph.has_node(node_id):
        return jsonify({"error": "Asset not found"}), 404
    criticality = kg_graph.nodes[node_id]["criticality"]
    technique_count = sum(1 for n in kg_graph.predecessors(node_id)
                           if kg_graph.nodes[n].get("kind") == "Technique")
    risk = round(criticality * (1 + technique_count * 0.1), 2)
    return jsonify({"hostname": hostname, "risk_score": risk})


@app.route("/kg/actor/<name>/techniques", methods=["GET"])
def get_actor_techniques(name):
    for n, d in kg_graph.nodes(data=True):
        if d.get("kind") == "ThreatActor" and d.get("name") == name:
            out = []
            for tech_node in kg_graph.successors(n):
                tdata = kg_graph.nodes[tech_node]
                if tdata.get("kind") == "Technique":
                    out.append({"attack_id": tdata["attack_id"], "name": tdata["name"]})
            return jsonify(out)
    return jsonify([])


# ---------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ACDSF unified backend running",
        "sdn_nodes": sdn_graph.number_of_nodes() if sdn_graph else 0,
        "kg_nodes": kg_graph.number_of_nodes() if kg_graph else 0,
        "nodes_blocked": len(removed_edges),
    })


# Load everything at import time (so it works both under `python app.py`
# locally AND under PythonAnywhere's WSGI runner, which imports this
# module without calling __main__)
load_sdn_graph()
load_kg_graph()
init_twin_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)