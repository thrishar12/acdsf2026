"""
kg_api.py
---------
ACDSF Member 2 — Knowledge Graph REST API
Same endpoints/port (8002) as the original guide's Neo4j version,
but backed by our networkx AttackKnowledgeGraph instead of a Neo4j server.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from knowledge_graph import AttackKnowledgeGraph, GRAPH_PATH

app = FastAPI(title="ACDSF Knowledge Graph API (networkx-backed)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

kg = AttackKnowledgeGraph()


@app.on_event("startup")
def startup():
    try:
        kg.load(GRAPH_PATH)
    except FileNotFoundError:
        raise RuntimeError(
            f"{GRAPH_PATH} not found. Run: python knowledge_graph.py --build first."
        )


@app.get("/attack-paths/{sector}")
def get_attack_paths(sector: str):
    return kg.attack_paths_for_sector(sector)


@app.get("/asset-risk/{hostname}")
def get_asset_risk(hostname: str):
    risk = kg.asset_risk(hostname)
    if risk is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"hostname": hostname, "risk_score": risk}


@app.get("/actor/{name}/techniques")
def get_actor_techniques(name: str):
    return kg.techniques_used_by(name)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "nodes": kg.graph.number_of_nodes(),
        "edges": kg.graph.number_of_edges(),
    }


def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8002)


if __name__ == "__main__":
    run_server()
