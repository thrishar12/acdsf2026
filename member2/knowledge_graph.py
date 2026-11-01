"""
knowledge_graph.py
-------------------
ACDSF Member 2 — Attack Knowledge Graph

Standardized replacement for a Neo4j-backed knowledge graph, using networkx
as the graph engine so it runs entirely in-memory with no database server
(important on low-RAM machines).

Uses REAL MITRE ATT&CK Enterprise data (fetched directly from MITRE's
official CTI repository, the same source real threat-intel platforms use),
not fabricated sample data.

Schema (matches the guide's Neo4j schema):
    (ThreatActor) -[USES]-> (Technique)
    (Technique)   -[TARGETS]-> (Asset)          [added by your own topology]
    (Asset)       -[BELONGS_TO]-> (Sector)

Usage:
    python knowledge_graph.py --build      # downloads MITRE data, builds graph, saves to disk
    python knowledge_graph.py --serve      # starts a REST API on port 8002 (same port the guide uses)
"""

import argparse
import json
import os
import networkx as nx
import requests

ATTACK_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/"
    "enterprise-attack/enterprise-attack.json"
)
GRAPH_PATH = "knowledge_graph.gpickle.json"  # our own JSON-based persistence


class AttackKnowledgeGraph:
    """
    Wraps a networkx MultiDiGraph representing threat actors, techniques,
    and (optionally) your own simulation assets from Member 1's topology.
    """

    def __init__(self):
        self.graph = nx.MultiDiGraph()

    # ---------------------------------------------------------------
    # Building the graph from real MITRE ATT&CK data
    # ---------------------------------------------------------------
    def load_mitre_attack(self, limit_groups: int = 40, limit_techniques: int = 200):
        """
        Downloads the official MITRE ATT&CK Enterprise dataset and populates
        the graph with real threat actor (intrusion-set) and technique
        (attack-pattern) nodes, plus real USES relationships between them.
        """
        print("Downloading MITRE ATT&CK Enterprise dataset...")
        data = requests.get(ATTACK_URL, timeout=60).json()
        objects = data["objects"]

        # Index objects by STIX id for relationship resolution
        by_id = {obj["id"]: obj for obj in objects if "id" in obj}

        groups = [o for o in objects if o.get("type") == "intrusion-set"][:limit_groups]
        techniques = [o for o in objects if o.get("type") == "attack-pattern"][:limit_techniques]
        relationships = [o for o in objects if o.get("type") == "relationship"
                          and o.get("relationship_type") == "uses"]

        print(f"  {len(groups)} threat actor groups")
        print(f"  {len(techniques)} techniques")

        # Add ThreatActor nodes
        for g in groups:
            self.graph.add_node(
                g["id"],
                kind="ThreatActor",
                name=g.get("name", "Unknown"),
                aliases=g.get("aliases", []),
                description=(g.get("description", "") or "")[:300],
            )

        # Add Technique nodes (with real ATT&CK IDs, e.g. T1566.001)
        technique_ids_kept = set()
        for t in techniques:
            attack_id = None
            for ref in t.get("external_references", []):
                if ref.get("source_name") == "mitre-attack":
                    attack_id = ref.get("external_id")
                    break
            if not attack_id:
                continue
            tactic = None
            phases = t.get("kill_chain_phases", [])
            if phases:
                tactic = phases[0].get("phase_name")

            self.graph.add_node(
                t["id"],
                kind="Technique",
                attack_id=attack_id,
                name=t.get("name", "Unknown"),
                tactic=tactic or "unknown",
                description=(t.get("description", "") or "")[:300],
            )
            technique_ids_kept.add(t["id"])

        # Add real USES relationships: ThreatActor -> Technique
        group_ids = {g["id"] for g in groups}
        edge_count = 0
        for r in relationships:
            src, tgt = r.get("source_ref"), r.get("target_ref")
            if src in group_ids and tgt in technique_ids_kept:
                self.graph.add_edge(src, tgt, kind="USES")
                edge_count += 1

        print(f"  {edge_count} real USES relationships added")
        print(f"Graph built: {self.graph.number_of_nodes()} nodes, "
              f"{self.graph.number_of_edges()} edges")

    # ---------------------------------------------------------------
    # Integrating with Member 1's simulation topology
    # ---------------------------------------------------------------
    def add_asset(self, hostname: str, sector: str, criticality: int, ip: str = ""):
        """Adds a simulation asset node (from Member 1's topology.json)."""
        node_id = f"asset:{hostname}"
        self.graph.add_node(
            node_id, kind="Asset", hostname=hostname, sector=sector,
            criticality=criticality, ip=ip,
        )
        return node_id

    def link_technique_to_asset(self, technique_attack_id: str, hostname: str):
        """Marks that a technique is relevant/targetable against a given asset."""
        tech_node = self._find_technique_by_attack_id(technique_attack_id)
        asset_node = f"asset:{hostname}"
        if tech_node and self.graph.has_node(asset_node):
            self.graph.add_edge(tech_node, asset_node, kind="TARGETS")

    def _find_technique_by_attack_id(self, attack_id: str):
        for n, d in self.graph.nodes(data=True):
            if d.get("kind") == "Technique" and d.get("attack_id") == attack_id:
                return n
        return None

    # ---------------------------------------------------------------
    # Queries (equivalent to the Cypher queries in the original guide)
    # ---------------------------------------------------------------
    def attack_paths_for_sector(self, sector: str):
        """
        Returns all (ThreatActor, Technique) pairs where the technique
        targets an asset in the given sector.
        """
        results = []
        assets_in_sector = [
            n for n, d in self.graph.nodes(data=True)
            if d.get("kind") == "Asset" and d.get("sector") == sector
        ]
        for asset in assets_in_sector:
            for tech_node in self.graph.predecessors(asset):
                tdata = self.graph.nodes[tech_node]
                if tdata.get("kind") != "Technique":
                    continue
                for actor_node in self.graph.predecessors(tech_node):
                    adata = self.graph.nodes[actor_node]
                    if adata.get("kind") == "ThreatActor":
                        results.append({
                            "actor": adata["name"],
                            "technique_id": tdata["attack_id"],
                            "technique_name": tdata["name"],
                            "tactic": tdata["tactic"],
                        })
        return results

    def asset_risk(self, hostname: str):
        """Risk score = criticality * (1 + number of techniques targeting it * 0.1)."""
        node_id = f"asset:{hostname}"
        if not self.graph.has_node(node_id):
            return None
        criticality = self.graph.nodes[node_id]["criticality"]
        technique_count = sum(
            1 for n in self.graph.predecessors(node_id)
            if self.graph.nodes[n].get("kind") == "Technique"
        )
        risk = criticality * (1 + technique_count * 0.1)
        return round(risk, 2)

    def techniques_used_by(self, actor_name: str):
        """All real MITRE techniques a given threat actor group uses."""
        for n, d in self.graph.nodes(data=True):
            if d.get("kind") == "ThreatActor" and d.get("name") == actor_name:
                out = []
                for tech_node in self.graph.successors(n):
                    tdata = self.graph.nodes[tech_node]
                    if tdata.get("kind") == "Technique":
                        out.append({"attack_id": tdata["attack_id"], "name": tdata["name"]})
                return out
        return []

    # ---------------------------------------------------------------
    # Persistence
    # ---------------------------------------------------------------
    def save(self, path: str = GRAPH_PATH):
        data = nx.node_link_data(self.graph)
        with open(path, "w") as f:
            json.dump(data, f)
        print(f"Saved graph to {path}")

    def load(self, path: str = GRAPH_PATH):
        with open(path) as f:
            data = json.load(f)
        self.graph = nx.node_link_graph(data, multigraph=True, directed=True)
        print(f"Loaded graph from {path}: {self.graph.number_of_nodes()} nodes")


def build_and_save():
    kg = AttackKnowledgeGraph()
    kg.load_mitre_attack()

    # Wire in a few of your own Member 1 assets as an example —
    # extend this using your real topology.json node list.
    kg.add_asset("GOVT-SRV1", "Government", criticality=9, ip="10.1.0.10")
    kg.add_asset("ENERGY-SRV1", "Energy", criticality=10, ip="10.2.0.10")
    kg.add_asset("FINANCE-SRV1", "Finance", criticality=10, ip="10.3.0.10")

    # Example: mark a well-known real technique as targeting these assets
    kg.link_technique_to_asset("T1566.001", "GOVT-SRV1")   # Spearphishing Attachment
    kg.link_technique_to_asset("T1003", "FINANCE-SRV1")    # OS Credential Dumping

    kg.save()

    print("\n--- Sample query: attack paths for Government sector ---")
    for row in kg.attack_paths_for_sector("Government"):
        print(" ", row)

    print("\n--- Sample query: asset risk for GOVT-SRV1 ---")
    print(" ", kg.asset_risk("GOVT-SRV1"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--serve", action="store_true")
    args = parser.parse_args()

    if args.build:
        build_and_save()
    elif args.serve:
        from kg_api import run_server
        run_server()
    else:
        parser.print_help()
