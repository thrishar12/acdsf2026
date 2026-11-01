"""
ics_detector.py
----------------
ACDSF Member 3 — ICS/OT Intrusion Detection (GNN-based)

Standardized replacement for the guide's Zeek + GNN pipeline. Zeek needs a
real network interface actively monitoring live traffic — your simulation
doesn't have real packets flowing over a real NIC, so there are no Zeek
logs to feed it. Rather than fabricate fake log files pretending to be
Zeek output, this module builds its graph DIRECTLY from your REAL
topology.json (the same file your actual Member 1 network_topology.py
and sdn_controller.py already use) — genuine structural data about your
real simulated network, not invented text logs.

A real Graph Convolutional Network autoencoder (same architecture family
as the guide's ics_detector.py, via torch_geometric) learns what "normal"
node connectivity patterns look like across your topology, then flags
nodes whose behavior deviates significantly — the same anomaly-detection
principle real ICS security research uses (e.g. detecting a compromised
PLC by its communication pattern differing from baseline), applied here
to your simulation's real graph structure plus a controlled, clearly
-labeled synthetic anomaly injection for demonstration and validation.

Usage:
    python ics_detector.py --train                    # train on your real topology.json
    python ics_detector.py --inject-anomaly NODE_ID    # test detection on a specific node
"""

import argparse
import json
import numpy as np
import torch
import torch.nn as nn
import networkx as nx
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data

TOPOLOGY_PATH = "topology.json"
MODEL_PATH = "ics_detector.pt"
NODE_FEATURES = 5  # [degree, is_ics_sector, is_core_infra, avg_neighbor_degree, criticality]

ICS_SECTORS = {"Energy", "Water", "Water/ICS", "Energy/SCADA"}


class ICSGraphDetector(nn.Module):
    """Graph autoencoder: learns to reconstruct normal node feature
    patterns from their real topology neighborhood; high reconstruction
    error on a node signals anomalous connectivity behavior."""

    def __init__(self, node_features: int = NODE_FEATURES, hidden: int = 32):
        super().__init__()
        self.conv1 = GCNConv(node_features, hidden)
        self.conv2 = GCNConv(hidden, hidden)
        self.decoder = nn.Linear(hidden, node_features)

    def forward(self, x, edge_index):
        h = torch.relu(self.conv1(x, edge_index))
        h = self.conv2(h, edge_index)
        return self.decoder(h)

    def anomaly_score(self, x, edge_index):
        reconstructed = self.forward(x, edge_index)
        return torch.mean((x - reconstructed) ** 2, dim=1)


def load_real_topology(path: str = TOPOLOGY_PATH):
    """
    Loads your REAL topology.json (same node-link format your
    network_topology.py / sdn_controller.py already produce and consume)
    and builds real structural node features from it — no fabricated logs.
    """
    with open(path) as f:
        data = json.load(f)
    try:
        graph = nx.node_link_graph(data, edges="links")
    except TypeError:
        graph = nx.node_link_graph(data)  # older networkx fallback

    node_list = list(graph.nodes())
    node_to_idx = {n: i for i, n in enumerate(node_list)}

    features = np.zeros((len(node_list), NODE_FEATURES), dtype=np.float32)
    degrees = dict(graph.degree())
    max_degree = max(degrees.values()) if degrees else 1

    for i, node in enumerate(node_list):
        attrs = graph.nodes[node]
        degree = degrees.get(node, 0)
        sector = attrs.get("sector", "")
        is_ics = 1.0 if sector in ICS_SECTORS else 0.0
        is_core = 1.0 if "CORE" in str(node).upper() or "NBR" in str(node).upper() else 0.0
        neighbor_degrees = [degrees.get(nb, 0) for nb in graph.neighbors(node)]
        avg_neighbor_degree = (sum(neighbor_degrees) / len(neighbor_degrees)) if neighbor_degrees else 0.0
        criticality = float(attrs.get("criticality", 5)) / 10.0

        features[i] = [
            degree / max_degree,
            is_ics,
            is_core,
            avg_neighbor_degree / max_degree,
            criticality,
        ]

    edges = [[node_to_idx[u], node_to_idx[v]] for u, v in graph.edges()]
    edges += [[node_to_idx[v], node_to_idx[u]] for u, v in graph.edges()]  # undirected -> both directions
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    x = torch.tensor(features, dtype=torch.float32)

    return Data(x=x, edge_index=edge_index), node_list


def train(topology_path: str = TOPOLOGY_PATH, epochs: int = 150):
    graph_data, node_list = load_real_topology(topology_path)
    print(f"Loaded real topology: {graph_data.x.shape[0]} nodes, "
          f"{graph_data.edge_index.shape[1]} directed edges")

    model = ICSGraphDetector()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    print("Training ICS anomaly detector on real topology structure...")
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        reconstruction = model(graph_data.x, graph_data.edge_index)
        loss = nn.MSELoss()(reconstruction, graph_data.x)
        loss.backward()
        optimizer.step()
        if epoch % 25 == 0:
            print(f"Epoch {epoch}/{epochs}: Loss = {loss.item():.6f}")

    torch.save({
        "model_state": model.state_dict(),
        "node_list": node_list,
    }, MODEL_PATH)
    print(f"Training complete! Saved to {MODEL_PATH}")

    # Report baseline anomaly scores for every real node, sorted
    model.eval()
    with torch.no_grad():
        scores = model.anomaly_score(graph_data.x, graph_data.edge_index)
    ranked = sorted(zip(node_list, scores.tolist()), key=lambda t: -t[1])
    print("\nTop 5 highest baseline anomaly scores (real nodes, no injected anomaly):")
    for node, score in ranked[:5]:
        print(f"  {node}: {score:.5f}")


def inject_and_test(node_id: str, topology_path: str = TOPOLOGY_PATH):
    """
    Loads the trained model, then tests it against the REAL topology with
    ONE node's features deliberately corrupted to simulate a compromised
    ICS device (e.g. abnormal connectivity pattern consistent with
    lateral movement/C2 beaconing), and reports whether the detector
    correctly flags it as the top anomaly.
    """
    ckpt = torch.load(MODEL_PATH, weights_only=False)
    model = ICSGraphDetector()
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    graph_data, node_list = load_real_topology(topology_path)
    if node_id not in node_list:
        raise ValueError(f"Node '{node_id}' not found in topology. Available: {node_list[:10]}...")

    idx = node_list.index(node_id)
    original = graph_data.x[idx].clone()

    # Simulate an anomalous ICS compromise signature: abnormally high
    # connectivity (as if beaconing to many hosts) and criticality feature
    # zeroed out (as if identity/labeling was spoofed) — a plausible,
    # clearly-labeled synthetic anomaly, not real attack traffic.
    graph_data.x[idx] = torch.tensor([1.0, graph_data.x[idx][1], 1.0, 1.0, 0.0])

    with torch.no_grad():
        scores = model.anomaly_score(graph_data.x, graph_data.edge_index)

    ranked = sorted(zip(node_list, scores.tolist()), key=lambda t: -t[1])
    rank = [n for n, _ in ranked].index(node_id) + 1
    top_node, top_score = ranked[0]

    print(f"Injected synthetic anomaly into: {node_id}")
    print(f"  {node_id}'s anomaly score: {scores[idx].item():.5f} (rank #{rank} of {len(node_list)})")
    print(f"  Highest-scoring node overall: {top_node} ({top_score:.5f})")
    if rank == 1:
        print("  DETECTION: SUCCESS — injected anomaly correctly identified as the top anomaly")
    else:
        print(f"  DETECTION: node ranked #{rank}, not top — see note on threshold tuning below")

    graph_data.x[idx] = original  # restore for cleanliness (in-memory only)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--inject-anomaly", type=str, default=None,
                         help="Node ID from your topology.json to test detection on")
    parser.add_argument("--topology", default=TOPOLOGY_PATH)
    parser.add_argument("--epochs", type=int, default=150)
    args = parser.parse_args()

    if args.train:
        train(topology_path=args.topology, epochs=args.epochs)
    elif args.inject_anomaly:
        inject_and_test(args.inject_anomaly, topology_path=args.topology)
    else:
        parser.print_help()