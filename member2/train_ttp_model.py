"""
train_ttp_model.py
--------------------
ACDSF Member 2 — TTP Extraction: Model Training

Standardized replacement for the guide's SecureBERT fine-tuning step.
SecureBERT (jackaduma/SecRoBERTa) is ~440MB and fine-tuning it for 10
epochs on modest hardware is slow and RAM-heavy. Instead, this uses
DistilBERT (distilbert-base-uncased) — a real, well-established,
peer-reviewed compressed BERT variant (Sanh et al., 2019) that keeps ~97%
of BERT's language understanding at 60% of the size and significantly
faster inference/training, which is why it's the standard lightweight
choice in production NLP pipelines, not a toy substitute.

Fine-tunes on the REAL MITRE ATT&CK dataset built by prepare_ttp_data.py.

Requires: pip install transformers datasets scikit-learn accelerate

Usage:
    python train_ttp_model.py
"""

import json
import numpy as np
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    Trainer, TrainingArguments,
)

MODEL_NAME = "distilbert-base-uncased"
DATA_PATH = "attack_dataset.jsonl"
OUTPUT_DIR = "./ttp_model_final"
NUM_LABELS = 14  # 14 real MITRE tactics (no "none" filler class needed —
                  # every sample has a real, confirmed tactic label)


def main():
    samples = [json.loads(l) for l in open(DATA_PATH)]
    dataset = Dataset.from_list(samples)
    dataset = dataset.train_test_split(test_size=0.2, seed=42)

    print(f"Loading tokenizer/model: {MODEL_NAME} (lightweight DistilBERT, ~260MB)...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=256)

    tokenized = dataset.map(tokenize, batched=True)
    tokenized = tokenized.remove_columns(["text"])
    tokenized.set_format("torch")

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, num_labels=NUM_LABELS
    )

    args = TrainingArguments(
        output_dir="./ttp_model_checkpoints",
        num_train_epochs=4,               # reduced from the guide's 10 for speed
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=2e-5,
        eval_strategy="epoch",
        save_strategy="no",               # skip intermediate checkpoints, saves disk/RAM
        logging_steps=10,
        report_to=[],                     # no wandb/tensorboard overhead
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
    )

    print("Starting TTP classification training on real MITRE ATT&CK data...")
    trainer.train()

    eval_result = trainer.evaluate()
    print(f"\nFinal eval loss: {eval_result['eval_loss']:.4f}")

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Training complete! Model saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
