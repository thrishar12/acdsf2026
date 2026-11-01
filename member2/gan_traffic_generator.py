"""
gan_traffic_generator.py
-------------------------
Lightweight Conditional GAN for generating synthetic NSL-KDD-style network
traffic samples. Trains in a few minutes on CPU (no GPU needed).

Fits into the ACDSF project like this:
  - Use it to generate synthetic attack/normal samples for demo purposes,
    or to stress-test your Random Forest classifier's robustness.
  - Much smaller/faster than the 200-epoch GAN in the original guide, and
    it reuses the SAME NSL-KDD dataset you already processed for the
    Random Forest classifier, so no new dataset download is needed.

Usage:
    python gan_traffic_generator.py --train      # train and save generator
    python gan_traffic_generator.py --generate 50 --label dos   # generate 50 fake DoS samples
"""

import argparse
import numpy as np
import torch
import torch.nn as nn
import pandas as pd
import os

# ---- CONFIG ----
# Point this at the SAME processed NSL-KDD CSV/features you already use
# for the Random Forest classifier in your existing project.
DATA_PATH = os.environ.get("NSL_KDD_PATH", "nsl_kdd_processed.csv")
LABEL_COL = "label"  # column holding class: normal / dos / probe / r2l / u2r
NOISE_DIM = 32
EPOCHS = 150          # small on purpose - a few minutes on CPU
BATCH_SIZE = 64
MODEL_PATH = "traffic_generator.pt"

CLASSES = ["normal", "dos", "probe", "r2l", "u2r"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


class Generator(nn.Module):
    """Takes noise + class label, outputs a synthetic feature vector."""

    def __init__(self, noise_dim, num_classes, feature_dim):
        super().__init__()
        self.label_emb = nn.Embedding(num_classes, num_classes)
        self.net = nn.Sequential(
            nn.Linear(noise_dim + num_classes, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Linear(256, feature_dim),
            nn.Sigmoid(),  # features are min-max scaled to [0, 1]
        )

    def forward(self, noise, labels):
        label_vec = self.label_emb(labels)
        x = torch.cat([noise, label_vec], dim=1)
        return self.net(x)


class Discriminator(nn.Module):
    """Tells real traffic from fake, conditioned on the claimed class."""

    def __init__(self, num_classes, feature_dim):
        super().__init__()
        self.label_emb = nn.Embedding(num_classes, num_classes)
        self.net = nn.Sequential(
            nn.Linear(feature_dim + num_classes, 128),
            nn.LeakyReLU(0.2),
            nn.Linear(128, 64),
            nn.LeakyReLU(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, x, labels):
        label_vec = self.label_emb(labels)
        return self.net(torch.cat([x, label_vec], dim=1))


def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Couldn't find {DATA_PATH}. Set NSL_KDD_PATH env var to point at "
            f"the processed numeric-features CSV you already built for the "
            f"Random Forest classifier (numeric columns + a 'label' column)."
        )
    df = pd.read_csv(DATA_PATH)
    labels = df[LABEL_COL].map(lambda c: CLASS_TO_IDX.get(str(c).lower(), 0)).values
    features = df.drop(columns=[LABEL_COL]).select_dtypes(include=[np.number])
    # min-max scale to [0,1] so Sigmoid output matches
    feat_min, feat_max = features.min(), features.max()
    scaled = (features - feat_min) / (feat_max - feat_min + 1e-9)
    return (
        torch.tensor(scaled.values, dtype=torch.float32),
        torch.tensor(labels, dtype=torch.long),
        feat_min,
        feat_max,
        list(features.columns),
    )


def train():
    X, y, feat_min, feat_max, columns = load_data()
    feature_dim = X.shape[1]

    G = Generator(NOISE_DIM, len(CLASSES), feature_dim)
    D = Discriminator(len(CLASSES), feature_dim)
    opt_G = torch.optim.Adam(G.parameters(), lr=2e-4)
    opt_D = torch.optim.Adam(D.parameters(), lr=2e-4)
    loss_fn = nn.BCELoss()

    n = X.shape[0]
    print(f"Training conditional GAN on {n} samples, {feature_dim} features...")

    for epoch in range(EPOCHS):
        perm = torch.randperm(n)
        for i in range(0, n, BATCH_SIZE):
            idx = perm[i:i + BATCH_SIZE]
            real_x, real_y = X[idx], y[idx]
            bsz = real_x.shape[0]

            noise = torch.randn(bsz, NOISE_DIM)
            fake_x = G(noise, real_y).detach()

            # Train Discriminator
            opt_D.zero_grad()
            loss_d = loss_fn(D(real_x, real_y), torch.ones(bsz, 1)) + \
                loss_fn(D(fake_x, real_y), torch.zeros(bsz, 1))
            loss_d.backward()
            opt_D.step()

            # Train Generator
            opt_G.zero_grad()
            noise2 = torch.randn(bsz, NOISE_DIM)
            fake_x2 = G(noise2, real_y)
            loss_g = loss_fn(D(fake_x2, real_y), torch.ones(bsz, 1))
            loss_g.backward()
            opt_G.step()

        if epoch % 25 == 0:
            print(f"Epoch {epoch}/{EPOCHS} | D-loss: {loss_d.item():.4f} | G-loss: {loss_g.item():.4f}")

    torch.save({
        "generator_state": G.state_dict(),
        "feature_dim": feature_dim,
        "feat_min": feat_min.to_dict(),
        "feat_max": feat_max.to_dict(),
        "columns": columns,
    }, MODEL_PATH)
    print(f"Done. Saved generator + scaling info to {MODEL_PATH}")


def generate(n_samples: int, label: str):
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Train the generator first: python gan_traffic_generator.py --train")
    ckpt = torch.load(MODEL_PATH, weights_only=False)
    G = Generator(NOISE_DIM, len(CLASSES), ckpt["feature_dim"])
    G.load_state_dict(ckpt["generator_state"])
    G.eval()

    label_idx = CLASS_TO_IDX.get(label.lower())
    if label_idx is None:
        raise ValueError(f"label must be one of {CLASSES}")

    noise = torch.randn(n_samples, NOISE_DIM)
    labels = torch.full((n_samples,), label_idx, dtype=torch.long)
    with torch.no_grad():
        scaled = G(noise, labels).numpy()

    # de-normalize back to original feature ranges
    feat_min = np.array([ckpt["feat_min"][c] for c in ckpt["columns"]])
    feat_max = np.array([ckpt["feat_max"][c] for c in ckpt["columns"]])
    real_scale = scaled * (feat_max - feat_min) + feat_min

    df = pd.DataFrame(real_scale, columns=ckpt["columns"])
    df.insert(0, "synthetic_label", label)
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--generate", type=int, default=0, help="number of samples to generate")
    parser.add_argument("--label", type=str, default="dos", choices=CLASSES)
    args = parser.parse_args()

    if args.train:
        train()
    elif args.generate:
        out = generate(args.generate, args.label)
        out_path = f"synthetic_{args.label}.csv"
        out.to_csv(out_path, index=False)
        print(f"Generated {args.generate} synthetic '{args.label}' samples -> {out_path}")
    else:
        parser.print_help()
