"""
prepare_cic_ids2017.py
-----------------------
Preprocesses the CIC-IDS2017 dataset CSV files into a unified, numeric,
clean dataset suitable for the ACDSF backend pipelines (GAN & XAI).

Features:
- Loads all CSVs in the MachineLearningCSV folder.
- Cleans whitespace from column headers.
- Handles np.inf and np.nan values safely.
- Maps specific attacks to broader categories (normal, dos, portscan, etc).
- Downsamples large files to maintain reasonable memory usage during local training.
- Outputs a single numeric CSV with a 'label' column.
"""

import pandas as pd
import numpy as np
import os
import glob
from sklearn.preprocessing import LabelEncoder

INPUT_DIR = "MachineLearningCSV/MachineLearningCVE"
OUTPUT_FILE = "cic_ids2017_processed.csv"
MAX_ROWS_PER_FILE = 50000  # Downsample to speed up local training

LABEL_MAP = {
    "BENIGN": "normal",
    "DoS Hulk": "dos",
    "DDoS": "dos",
    "PortScan": "portscan",
    "DoS GoldenEye": "dos",
    "FTP-Patator": "bruteforce",
    "SSH-Patator": "bruteforce",
    "DoS slowloris": "dos",
    "DoS Slowhttptest": "dos",
    "Bot": "botnet",
    "Web Attack \uFFFD Brute Force": "webattack",
    "Web Attack \uFFFD XSS": "webattack",
    "Web Attack \uFFFD Sql Injection": "webattack",
    "Web Attack  Brute Force": "webattack",
    "Web Attack  XSS": "webattack",
    "Web Attack  Sql Injection": "webattack",
    "Infiltration": "infiltration",
    "Heartbleed": "dos"
}

def clean_columns(df):
    """Remove leading/trailing whitespaces from column names."""
    df.columns = [col.strip() for col in df.columns]
    return df

def clean_data(df):
    """Replace Inf with NaN, then drop NaNs."""
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)
    return df

def map_labels(df, label_col="Label"):
    """Map specific CIC-IDS2017 labels to broader categories."""
    if label_col not in df.columns:
        print(f"Warning: Column '{label_col}' not found. Available columns: {df.columns}")
        return df
        
    df["label"] = df[label_col].map(lambda x: LABEL_MAP.get(str(x).strip(), "unknown"))
    df.drop(columns=[label_col], inplace=True)
    return df

def main():
    csv_files = glob.glob(os.path.join(INPUT_DIR, "*.csv"))
    if not csv_files:
        print(f"Error: No CSV files found in {INPUT_DIR}")
        return

    print(f"Found {len(csv_files)} CSV files. Beginning processing...")
    
    dataframes = []
    
    for file in csv_files:
        print(f"Processing {os.path.basename(file)}...")
        try:
            # Read CSV
            df = pd.read_csv(file)
            
            # Downsample if too large to save memory/training time
            if len(df) > MAX_ROWS_PER_FILE:
                df = df.sample(n=MAX_ROWS_PER_FILE, random_state=42)
                
            df = clean_columns(df)
            df = clean_data(df)
            df = map_labels(df)
            
            dataframes.append(df)
            print(f" -> Kept {len(df)} rows.")
        except Exception as e:
            print(f"Error processing {file}: {e}")

    if not dataframes:
        print("No data processed.")
        return

    print("Concatenating all data...")
    combined_df = pd.concat(dataframes, ignore_index=True)
    
    print("Encoding categorical features (if any)...")
    # Identify object columns (excluding 'label')
    cat_cols = combined_df.select_dtypes(include=["object"]).columns
    cat_cols = [c for c in cat_cols if c != "label"]
    
    for c in cat_cols:
        le = LabelEncoder()
        combined_df[c] = le.fit_transform(combined_df[c].astype(str))
        print(f" -> Encoded categorical column: {c}")

    # Keep only numeric columns + label
    numeric_cols = combined_df.select_dtypes(include=[np.number]).columns
    final_cols = list(numeric_cols) + ["label"]
    
    out_df = combined_df[final_cols].copy()
    
    # Final safety clean for any newly introduced NaNs during concat
    out_df.dropna(inplace=True)

    print(f"Saving to {OUTPUT_FILE}...")
    out_df.to_csv(OUTPUT_FILE, index=False)
    
    print("Done!")
    print(f"Final shape: {out_df.shape}")
    print("Label distribution:")
    print(out_df["label"].value_counts())

if __name__ == "__main__":
    main()
