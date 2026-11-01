"""
ACDSF — SDN Defense Integration
================================
Provides programmable access to the simulated SDN topology.
"""

import logging
import networkx as nx
import state

logger = logging.getLogger("acdsf.digital_twin.sdn")


def isolate_host(node_id: str) -> bool:
    """Isolates a host in the SDN graph."""
    with state.sdn_lock:
        if node_id not in state.sdn_graph:
            logger.warning(f"Attempted to isolate unknown host: {node_id}")
            return False
        
        edges = list(state.sdn_graph.edges(node_id, data=True))
        if edges:
            state.removed_edges[node_id] = edges
            state.sdn_graph.remove_edges_from([(u, v) for u, v, _d in edges])
            logger.info(f"Isolated host {node_id}, removed {len(edges)} edges")
        return True


def restore_host(node_id: str) -> bool:
    """Restores a previously isolated host."""
    with state.sdn_lock:
        if node_id not in state.removed_edges:
            logger.warning(f"No isolation record found for host: {node_id}")
            return False
            
        edges = state.removed_edges.pop(node_id)
        state.sdn_graph.add_edges_from([(u, v, d) for u, v, d in edges])
        logger.info(f"Restored host {node_id}, added {len(edges)} edges")
        return True


def increase_latency(src: str, dst: str, amount: float):
    """Artificially increases latency on a link (DoS simulation)."""
    with state.sdn_lock:
        if state.sdn_graph.has_edge(src, dst):
            current = state.sdn_graph[src][dst].get("latency_ms", 10.0)
            state.sdn_graph[src][dst]["latency_ms"] = current + amount
            logger.info(f"Increased latency on {src}-{dst} to {current + amount}ms")
            
def reset_latency(src: str, dst: str, base_val: float = 10.0):
    """Resets latency on a link."""
    with state.sdn_lock:
        if state.sdn_graph.has_edge(src, dst):
            state.sdn_graph[src][dst]["latency_ms"] = base_val

