"""Reproduce and export only the neuropathy notebook's Random Forest pipeline."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv("/Users/irdina/Downloads/data.csv")
df["NEU"] = df["NEU"].replace({"neu": 1, "nonneu": 0}).astype(int)
numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
numeric_cols.remove("NEU")
df[numeric_cols] = df[numeric_cols].interpolate(method="linear").bfill().ffill()
df.drop(columns=["RET", "CV", "PER VAS", "SL.NO", "NAME", "DIA LIFE"], inplace=True)
for column in df.select_dtypes(include="object").columns:
    df[column] = df[column].fillna(df[column].mode()[0])
df = df.dropna(subset=["NEU"]).copy()

y = df["NEU"].astype(int)
X = df.drop(columns=["NEU"])
features = X.select_dtypes(include=["number"]).columns.tolist()
preprocessor = ColumnTransformer([
    ("numerical", Pipeline([("imputer", SimpleImputer(strategy="median"))]), features)
])
X_train_full, X_test, y_train_full, y_test = train_test_split(
    X, y, test_size=0.20, stratify=y, random_state=42
)
X_train, _, y_train, _ = train_test_split(
    X_train_full, y_train_full, test_size=0.25, stratify=y_train_full, random_state=42
)
pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", RandomForestClassifier(
        n_estimators=200, max_depth=10, class_weight="balanced", random_state=42
    )),
])
pipeline.fit(X_train, y_train)
probabilities = pipeline.predict_proba(X_test)[:, 1]
predictions = pipeline.predict(X_test)
model = pipeline.named_steps["model"]
imputer = pipeline.named_steps["preprocessor"].named_transformers_["numerical"].named_steps["imputer"]

def export_tree(estimator):
    tree = estimator.tree_
    return {
        "childrenLeft": tree.children_left.tolist(),
        "childrenRight": tree.children_right.tolist(),
        "feature": tree.feature.tolist(),
        "threshold": tree.threshold.tolist(),
        "values": tree.value[:, 0, :].tolist(),
    }

payload = {
    "modelType": "RandomForestClassifier",
    "target": "NEU",
    "targetMeaning": "neuropathy",
    "features": features,
    "medians": imputer.statistics_.tolist(),
    "treeCount": len(model.estimators_),
    "trees": [export_tree(tree) for tree in model.estimators_],
    "validation": {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "rocAuc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "testSamples": int(len(y_test)),
    },
    "training": {"nEstimators": 200, "maxDepth": 10, "classWeight": "balanced", "randomState": 42},
}

(ROOT / "model-artifacts").mkdir(exist_ok=True)
(ROOT / "public" / "models").mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, ROOT / "model-artifacts" / "random_forest_neuropathy_pipeline.joblib")
(ROOT / "public" / "models" / "random_forest_neuropathy.json").write_text(
    json.dumps(payload, separators=(",", ":")), encoding="utf-8"
)
print(json.dumps({"features": features, "validation": payload["validation"]}, indent=2))
