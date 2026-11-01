"""
prepare_nsl_kdd.py
---------------------
Preprocesses a Kaggle-downloaded NSL-KDD CSV (train.csv or similar) into
the numeric format gan_traffic_generator.py needs: numeric feature columns
+ a 'label' column with values in {normal, dos, probe, r2l, u2r}.

Handles the common Kaggle NSL-KDD column naming variations automatically.

Install: pip install pandas numpy scikit-learn
Run:     python prepare_nsl_kdd.py path\to\train.csv
Output:  nsl_kdd_processed.csv (in the same folder)
"""

import pandas as pd
import numpy as np
import sys
from sklearn.preprocessing import LabelEncoder

# Maps the ~40 specific NSL-KDD attack names to the 5 standard categories
ATTACK_CATEGORY_MAP = {
    "normal": "normal",
    # DoS
    "back": "dos", "land": "dos", "neptune": "dos", "pod": "dos", "smurf": "dos",
    "teardrop": "dos", "apache2": "dos", "udpstorm": "dos", "processtable": "dos",
    "worm": "dos", "mailbomb": "dos",
    # Probe
    "ipsweep": "probe", "nmap": "probe", "portsweep": "probe", "satan": "probe",
    "mscan": "probe", "saint": "probe",
    # R2L
    "ftp_write": "r2l", "guess_passwd": "r2l", "imap": "r2l", "multihop": "r2l",
    "phf": "r2l", "spy": "r2l", "warezclient": "r2l", "warezmaster": "r2l",
    "sendmail": "r2l", "named": "r2l", "snmpgetattack": "r2l", "snmpguess": "r2l",
    "xlock": "r2l", "xsnoop": "r2l", "httptunnel": "r2l",
    # U2R
    "buffer_overflow": "u2r", "loadmodule": "u2r", "perl": "u2r", "rootkit": "u2r",
    "ps": "u2r", "sqlattack": "u2r", "xterm": "u2r",
}


def find_label_column(df: pd.DataFrame) -> str:
    """Kaggle versions of NSL-KDD use different names for the label column."""
    candidates = ["class", "Class", "label", "Label", "attack_type", "outcome", " label"]
    for c in candidates:
        if c in df.columns:
            return c
    # fallback: last column is very often the label in NSL-KDD exports
    print(f"Couldn't find a standard label column name. Assuming last column "
          f"'{df.columns[-1]}' is the label.")
    return df.columns[-1]


# Standard NSL-KDD column names (KDDTrain+.txt / KDDTest+.txt have NO header row)
NSL_KDD_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
    "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted", "num_root", "num_file_creations",
    "num_shells", "num_access_files", "num_outbound_cmds", "is_host_login",
    "is_guest_login", "count", "srv_count", "serror_rate", "srv_serror_rate",
    "rerror_rate", "srv_rerror_rate", "same_srv_rate", "diff_srv_rate",
    "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate", "dst_host_serror_rate", "dst_host_srv_serror_rate",
    "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "class", "difficulty",
]


def main(input_path: str, output_path: str = "nsl_kdd_processed.csv"):
    print(f"Reading {input_path} ...")
    # KDDTrain+.txt / KDDTest+.txt have no header row - detect this and apply
    # the standard NSL-KDD column names automatically.
    if input_path.lower().endswith(".txt"):
        df = pd.read_csv(input_path, header=None, names=NSL_KDD_COLUMNS)
        print("Detected .txt format (no header) - applied standard NSL-KDD column names")
    else:
        df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")

    label_col = find_label_column(df)
    print(f"Using '{label_col}' as the label column")

    # normalize label text and map to 5 categories (unmapped values -> keep as-is, lowercased)
    df["label"] = df[label_col].astype(str).str.strip().str.lower()
    df["label"] = df["label"].map(lambda x: ATTACK_CATEGORY_MAP.get(x, x))

    # drop the original label column and any obvious non-feature columns
    drop_cols = [c for c in [label_col, "difficulty", "difficulty_level", "id"] if c in df.columns]
    features = df.drop(columns=drop_cols + ["label"])

    # encode categorical columns (protocol_type, service, flag) to numbers
    cat_cols = features.select_dtypes(include=["object"]).columns
    for c in cat_cols:
        le = LabelEncoder()
        features[c] = le.fit_transform(features[c].astype(str))
        print(f"Encoded categorical column: {c} ({len(le.classes_)} unique values)")

    # keep only numeric columns from here
    features = features.select_dtypes(include=[np.number])

    out = features.copy()
    out["label"] = df["label"]

    out.to_csv(output_path, index=False)
    print(f"\nSaved processed data to {output_path}")
    print(f"Final shape: {out.shape}")
    print("\nLabel distribution:")
    print(out["label"].value_counts())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python prepare_nsl_kdd.py path\\to\\train.csv")
        sys.exit(1)
    main(sys.argv[1])