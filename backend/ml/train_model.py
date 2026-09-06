import os, sys
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from feature_engineering import build_feature_matrix

FEATURE_COLS = [
    "highway_score",
    "oneway",
    "bridge",
    "road_length",
    "dist_to_water_m",
    "dist_to_drain_m",
    "flood_count",
    "avg_rainfall_mm",
]

LABEL_MAP    = {0: "low", 1: "medium", 2: "high"}
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "puddlex_model.joblib")
SCALER_PATH  = os.path.join(os.path.dirname(__file__), "puddlex_scaler.joblib")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "feature_columns.json")

def train():
    print("=== PuddleX Random Forest Training ===\n")

    df, _ = build_feature_matrix()

    X = df[FEATURE_COLS].fillna(0)
    y = df["risk_label"]

    print(f"Dataset size : {len(X)} samples")
    print(f"Features     : {FEATURE_COLS}")
    print(f"Class counts : {dict(y.value_counts())}\n")

    # Scale features
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    # Since we only have 319 roads, use 80/20 split
    # and cross-validation for reliability
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2,
        random_state=42, stratify=y if y.nunique() > 1 else None
    )

    model = RandomForestClassifier(
        n_estimators  = 200,
        max_depth     = 8,
        min_samples_split = 3,
        min_samples_leaf  = 1,
        class_weight  = "balanced",
        random_state  = 42,
        n_jobs        = -1
    )

    print("Training Random Forest (200 trees)...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    unique_labels = sorted(y.unique())
    target_names = [LABEL_MAP[i].title() + " Risk" for i in unique_labels]

    print("\n=== Classification Report ===")
    print(classification_report(y_test, y_pred,
          labels=unique_labels,
          target_names=target_names,
          zero_division=0))

    print("=== Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred, labels=unique_labels))

    # Cross validation
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="accuracy")
    print(f"\n5-Fold CV Accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    # Feature importance
    importances = model.feature_importances_
    print("\n=== Feature Importances ===")
    for feat, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1]):
        print(f"  {feat:<25} {imp:.4f}")

    # Save model and scaler
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    import json
    with open(FEATURES_PATH, "w") as f:
        json.dump(FEATURE_COLS, f)

    print(f"\nModel saved  : {MODEL_PATH}")
    print(f"Scaler saved : {SCALER_PATH}")
    print("Training complete.")

if __name__ == "__main__":
    train()
