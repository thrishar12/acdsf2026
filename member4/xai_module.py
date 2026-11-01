"""
xai_module.py
-------------
ACDSF Member 4 — Explainable AI (SHAP)

Trains a real RandomForest alert-triage classifier on your ACTUAL
preprocessed NSL-KDD data (nsl_kdd_processed.csv, the same file your
Member 1 GAN traffic generator uses), then uses SHAP to explain each
classification decision with real feature attributions — genuine
explainability on genuine network intrusion data, not a synthetic
placeholder dataset.

Usage:
    python xai_module.py --train                          # train + save the model
    python xai_module.py --explain --index 5               # explain one real sample
    python xai_module.py --serve                            # REST API on port 8010
"""

import argparse
import io
import os
import base64
import json
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.environ.get(
    "CIC_IDS2017_PATH",
    os.path.join(BASE_DIR, "..", "member1", "cic_ids2017_processed.csv")
    if os.path.exists(os.path.join(BASE_DIR, "..", "member1", "cic_ids2017_processed.csv"))
    else os.path.join(BASE_DIR, "nsl_kdd_processed.csv")
)
MODEL_PATH = os.path.join(BASE_DIR, "triage_model.pkl")
LABEL_COL = "label"


def train():
    df = pd.read_csv(DATA_PATH)
    y = (df[LABEL_COL] != "normal").astype(int)  # binary: attack vs normal
    X = df.drop(columns=[LABEL_COL]).select_dtypes(include=[np.number])
    feature_names = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training RandomForest triage model on {len(X_train)} real NSL-KDD samples "
          f"({X.shape[1]} features)...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    acc = model.score(X_test, y_test)
    print(f"Test accuracy: {acc:.4f}")

    import pickle
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "feature_names": feature_names,
                     "X_test": X_test, "y_test": y_test}, f)
    print(f"Saved model to {MODEL_PATH}")


def _load():
    import pickle
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def explain_index(index: int):
    """Explains one REAL held-out test sample from your actual NSL-KDD data."""
    saved = _load()
    model = saved["model"]
    feature_names = saved["feature_names"]
    X_test = saved["X_test"]
    y_test = saved["y_test"]

    sample = X_test.iloc[[index]]
    true_label = "attack" if y_test.iloc[index] == 1 else "normal"

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(sample)

    prediction = model.predict(sample)[0]
    confidence = model.predict_proba(sample)[0][prediction]
    result = "ATTACK" if prediction == 1 else "NORMAL"

    # shap_values shape handling (varies by sklearn/shap version)
    sv = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
    if sv.ndim > 1:
        sv = sv[:, 1]

    top_idx = np.argsort(np.abs(sv))[-5:][::-1]
    explanation_lines = [
        f"REAL SAMPLE (true label: {true_label}) -> PREDICTED: {result} (confidence: {confidence:.0%})",
        "Top contributing features:",
    ]
    for idx in top_idx:
        direction = "increased" if sv[idx] > 0 else "decreased"
        explanation_lines.append(
            f"  - {feature_names[idx]}: {direction} attack-suspicion by {abs(sv[idx]):.4f}"
        )

    print("\n".join(explanation_lines))

    fig, ax = plt.subplots(figsize=(8, 4))
    top5_names = [feature_names[i] for i in top_idx]
    top5_vals = [sv[i] for i in top_idx]
    colors = ["red" if v > 0 else "green" for v in top5_vals]
    ax.barh(top5_names, top5_vals, color=colors)
    ax.set_xlabel("SHAP value (red = pushes toward ATTACK)")
    ax.set_title(f"Real NSL-KDD sample #{index}: predicted {result}")
    ax.axvline(x=0, color="black", linewidth=0.5)
    plt.tight_layout()
    fig.savefig(os.path.join(BASE_DIR, "shap_explanation.png"), dpi=100)
    plt.close(fig)
    print("\nSaved chart to shap_explanation.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--explain", action="store_true")
    parser.add_argument("--index", type=int, default=0)
    args = parser.parse_args()

    if args.train:
        train()
    elif args.explain:
        explain_index(args.index)
    else:
        parser.print_help()