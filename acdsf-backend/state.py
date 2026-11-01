"""
ACDSF — Global State
=====================
Holds in-memory graphs and locks for the backend.
"""

import threading
import networkx as nx

sdn_graph = nx.Graph()
sdn_lock = threading.Lock()
removed_edges = {}

kg_graph = nx.MultiDiGraph()
