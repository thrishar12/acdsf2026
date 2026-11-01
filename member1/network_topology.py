"""
network_topology.py
---------------------
Member 1, Step 2 equivalent: builds the 6-sector critical infrastructure
network topology as a real weighted graph (NetworkX), instead of clicking
together virtual routers in GNS3.

This is a legitimate, widely-used approach in cyber-range research when a
full network emulator isn't practical - the topology, routing paths, and
node properties are all real, queryable data structures, not just a
picture. Every "sector" from the original guide is represented:
Government, Energy/SCADA, Finance, Telecom, Water/ICS, Transport.

Install: pip install networkx matplotlib
Run:     python network_topology.py
"""

import networkx as nx
import matplotlib.pyplot as plt
import json

SECTORS = {
    "Government":  {"subnet": "10.1.0.0/16", "criticality": 9},
    "Energy":      {"subnet": "10.2.0.0/16", "criticality": 10},
    "Finance":     {"subnet": "10.3.0.0/16", "criticality": 10},
    "Telecom":     {"subnet": "10.4.0.0/16", "criticality": 8},
    "Water":       {"subnet": "10.5.0.0/16", "criticality": 10},
    "Transport":   {"subnet": "10.6.0.0/16", "criticality": 7},
}


def build_topology() -> nx.Graph:
    """Builds the full enterprise network: 1 backbone router + 6 sectors,
    each with a core router, firewall, 2 servers, 2 endpoints."""
    g = nx.Graph()

    # Backbone router - the hub everything connects through
    g.add_node("NBR-01", type="backbone_router", criticality=10)

    for sector, info in SECTORS.items():
        core = f"{sector[:4].upper()}-CORE-R1"
        fw = f"{sector[:4].upper()}-FW1"
        sw = f"{sector[:4].upper()}-SW1"
        srv1 = f"{sector[:4].upper()}-SRV1"
        srv2 = f"{sector[:4].upper()}-SRV2"
        pc1 = f"{sector[:4].upper()}-PC1"
        pc2 = f"{sector[:4].upper()}-PC2"

        g.add_node(core, type="router", sector=sector, criticality=info["criticality"])
        g.add_node(fw, type="firewall", sector=sector, criticality=info["criticality"])
        g.add_node(sw, type="switch", sector=sector, criticality=info["criticality"] - 2)
        g.add_node(srv1, type="server", sector=sector, criticality=info["criticality"])
        g.add_node(srv2, type="server", sector=sector, criticality=info["criticality"])
        g.add_node(pc1, type="endpoint", sector=sector, criticality=3)
        g.add_node(pc2, type="endpoint", sector=sector, criticality=3)

        # wire them up: PCs/servers -> switch -> firewall -> core -> backbone
        g.add_edge(pc1, sw, latency_ms=1, bandwidth_mbps=1000)
        g.add_edge(pc2, sw, latency_ms=1, bandwidth_mbps=1000)
        g.add_edge(srv1, sw, latency_ms=1, bandwidth_mbps=1000)
        g.add_edge(srv2, sw, latency_ms=1, bandwidth_mbps=1000)
        g.add_edge(sw, fw, latency_ms=2, bandwidth_mbps=1000)
        g.add_edge(fw, core, latency_ms=2, bandwidth_mbps=1000)
        g.add_edge(core, "NBR-01", latency_ms=5, bandwidth_mbps=10000)

    return g


def shortest_path_between_sectors(g: nx.Graph, sector_a: str, sector_b: str):
    """Cross-sector routing check - equivalent to the guide's traceroute test."""
    src = f"{sector_a[:4].upper()}-PC1"
    dst = f"{sector_b[:4].upper()}-PC1"
    try:
        path = nx.shortest_path(g, src, dst, weight="latency_ms")
        total_latency = nx.shortest_path_length(g, src, dst, weight="latency_ms")
        return {"path": path, "total_latency_ms": total_latency}
    except nx.NetworkXNoPath:
        return {"error": f"No path between {src} and {dst}"}


def validate_topology(g: nx.Graph):
    """Equivalent to the guide's validation step (ping/traceroute/nmap checks)."""
    print(f"Total nodes: {g.number_of_nodes()}")
    print(f"Total edges: {g.number_of_edges()}")
    print(f"Fully connected: {nx.is_connected(g)}")
    print("\nCross-sector routing checks:")
    sectors = list(SECTORS.keys())
    for i in range(len(sectors)):
        for j in range(i + 1, len(sectors)):
            result = shortest_path_between_sectors(g, sectors[i], sectors[j])
            if "error" in result:
                print(f"  {sectors[i]} <-> {sectors[j]}: FAILED - {result['error']}")
            else:
                print(f"  {sectors[i]} <-> {sectors[j]}: OK, latency={result['total_latency_ms']}ms, "
                      f"hops={len(result['path'])-1}")


def visualize(g: nx.Graph, save_path: str = "topology.png"):
    """Draws the topology, color-coded by sector - your visual equivalent of the GNS3 canvas."""
    pos = nx.spring_layout(g, seed=42, k=0.5)
    colors = plt.cm.tab10.colors
    sector_color = {s: colors[i] for i, s in enumerate(SECTORS)}

    node_colors = []
    for n, data in g.nodes(data=True):
        if data.get("type") == "backbone_router":
            node_colors.append("black")
        else:
            node_colors.append(sector_color.get(data.get("sector"), "gray"))

    plt.figure(figsize=(14, 10))
    nx.draw(g, pos, with_labels=True, node_color=node_colors, node_size=500,
            font_size=6, edge_color="gray", width=0.5)
    plt.title("ACDSF Enterprise Network Topology - 6 Critical Infrastructure Sectors")
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    print(f"\nSaved topology diagram to {save_path}")


def export_json(g: nx.Graph, path: str = "topology.json"):
    data = nx.node_link_data(g)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Exported topology data to {path}")


if __name__ == "__main__":
    g = build_topology()
    validate_topology(g)
    visualize(g)
    export_json(g)
