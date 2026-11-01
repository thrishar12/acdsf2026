"""
ttp_api.py
----------
ACDSF Member 2 — TTP Extraction REST API

Serves the fine-tuned DistilBERT model trained by train_ttp_model.py.
Same endpoint shape as the original guide's ttp_api.py (port 8001),
so other modules can query it identically.

Usage:
    python ttp_api.py
"""

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import uvicorn

MODEL_DIR = "./ttp_model_final"

TACTICS = [
    "initial-access", "execution", "persistence", "privilege-escalation",
    "defense-evasion", "credential-access", "discovery", "lateral-movement",
    "collection", "command-and-control", "exfiltration", "impact",
    "reconnaissance", "resource-development",
]

app = FastAPI(title="ACDSF TTP Extraction API (DistilBERT-based)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

tokenizer = None
model = None


@app.on_event("startup")
def load_model():
    global tokenizer, model
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.eval()
        print(f"TTP model loaded from {MODEL_DIR}")
    except OSError:
        raise RuntimeError(
            f"{MODEL_DIR} not found. Run: python train_ttp_model.py first."
        )


class TextRequest(BaseModel):
    text: str


@app.post("/extract")
def extract_ttps(req: TextRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    inputs = tokenizer(req.text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        logits = model(**inputs).logits
    probs = torch.softmax(logits, dim=1)[0]
    k = min(3, len(TACTICS))
    top_k = probs.topk(k)
    results = [
        {"tactic": TACTICS[idx], "confidence": round(score.item(), 3)}
        for idx, score in zip(top_k.indices, top_k.values)
    ]
    return {"extracted_ttps": results}


@app.get("/health")
def health():
    return {"status": "ok" if model is not None else "model not loaded"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
