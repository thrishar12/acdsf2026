"""
sdn_controller.py
--------------------
Member 1, Step 5 equivalent: replaces OpenDaylight/Karaf with a Flask API
that operates directly on the topology graph from network_topology.py.
Blocking a host means removing its edges from the live graph (so routing
queries correctly show it as unreachable) and flagging it in the digital
twin - functionally the same outcome as an OpenFlow DROP rule, without
needing Java/Karaf/OpenDaylight running.

Endpoints match the shape used elsewhere in the project so your red/blue
agent code can call them the same way as the original guide's SDN gateway:
    POST /block-host    {"node_id": "..."}
    POST /restore-host  {"node_id": "..."}
    GET  /topology
    GET  /path?src=...&dst=...

Install: pip install flask networkx requests
Run:     python sdn_controller.py
"""

from flask import Flask, jsonify, request
import networkx as nx
import json
import requests

app = Flask(__name__)
TOPOLOGY_PATH = "topology.json"
DIGITAL_TWIN_URL = "http://localhost:5000"

# Live in-memory graph - the "network state" the SDN controller manages
graph = None
removed_edges = {}  # node_id -> list of (u, v, data) removed, for restore


def load_graph():
    global graph
    with open(TOPOLOGY_PATH) as f:
        data = json.load(f)
    graph = nx.node_link_graph(data)
    print(f"Loaded topology: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")


@app.route("/block-host", methods=["POST"])
def block_host():
    node_id = request.json.get("node_id")
    if node_id not in graph:
        return jsonify({"error": f"Node {node_id} not in topology"}), 404

    # remove all edges touching this node - it becomes unreachable
    edges = list(graph.edges(node_id, data=True))
    removed_edges[node_id] = edges
    graph.remove_edges_from([(u, v) for u, v, d in edges])

    # reflect the block in the digital twin, if it's running
    try:
        requests.put(f"{DIGITAL_TWIN_URL}/twins/{node_id}",
                     json={"cpu_load": 0, "is_compromised": 1, "alert_count": 1}, timeout=2)
    except requests.exceptions.ConnectionError:
        pass  # digital twin not running - block still succeeds on the graph itself

    return jsonify({"status": "blocked", "node_id": node_id, "edges_removed": len(edges)})


@app.route("/restore-host", methods=["POST"])
def restore_host():
    node_id = request.json.get("node_id")
    if node_id not in removed_edges:
        return jsonify({"error": f"No block record for {node_id}"}), 404

    graph.add_edges_from([(u, v, d) for u, v, d in removed_edges[node_id]])
    del removed_edges[node_id]
    return jsonify({"status": "restored", "node_id": node_id})


@app.route("/topology", methods=["GET"])
def get_topology():
    return jsonify(nx.node_link_data(graph))


@app.route("/path", methods=["GET"])
def get_path():
    src, dst = request.args.get("src"), request.args.get("dst")
    if src not in graph or dst not in graph:
        return jsonify({"error": "Unknown node"}), 404
    try:
        path = nx.shortest_path(graph, src, dst, weight="latency_ms")
        latency = nx.shortest_path_length(graph, src, dst, weight="latency_ms")
        return jsonify({"path": path, "latency_ms": latency, "reachable": True})
    except nx.NetworkXNoPath:
        return jsonify({"reachable": False, "reason": "No path - host may be blocked"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "SDN controller running", "nodes_blocked": len(removed_edges)})


if __name__ == "__main__":
    load_graph()
    app.run(host="127.0.0.1", port=8000, debug=False)
