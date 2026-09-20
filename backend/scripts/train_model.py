from pathlib import Path
import sys
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "risk_training.csv"
OUT = ROOT / "models" / "risk_model.joblib"

df = pd.read_csv(DATA)
features = ["rainfall_mm","slope_deg","elevation_m","soil_moisture","historical_events","infrastructure_density"]
X, y = df[features], df["landslide_risk"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(
    n_estimators=250,
    max_depth=10,
    min_samples_leaf=3,
    random_state=42,
    class_weight="balanced"
)
model.fit(X_train, y_train)

pred = model.predict_proba(X_test)[:,1]
print(classification_report(y_test, (pred >= 0.5).astype(int)))
print("ROC-AUC:", round(roc_auc_score(y_test, pred), 4))

joblib.dump({"model": model, "features": features}, OUT)
print("Saved:", OUT)
