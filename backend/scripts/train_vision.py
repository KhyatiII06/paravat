"""Train a small prototype image classifier.

Expected dataset:
backend/data/vision/
  landslide/*.jpg
  flash_flood/*.jpg
  road_damage/*.jpg
  bridge_damage/*.jpg
  normal/*.jpg

This is for the hackathon prototype only. Do not treat a small dataset as a
validated disaster-detection model.
"""
from pathlib import Path
import joblib
import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1] / "data" / "vision"
OUT = Path(__file__).resolve().parents[1] / "models" / "vision_model.joblib"
SIZE = (32, 32)

X, y = [], []
for label_dir in sorted(ROOT.glob("*")):
    if not label_dir.is_dir(): continue
    for path in label_dir.glob("*"):
        try:
            im = Image.open(path).convert("RGB").resize(SIZE)
            X.append(np.asarray(im, dtype=np.float32).reshape(-1) / 255.0)
            y.append(label_dir.name)
        except Exception: pass

if len(set(y)) < 2 or len(y) < 20:
    raise SystemExit("Add at least 20 labeled images across 2+ classes before training.")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=max(5, int(np.ceil(len(X) * 0.2))),
    random_state=42,
    stratify=y,
)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
model.fit(X_train, y_train)
print("validation accuracy:", round(model.score(X_test, y_test), 3))
joblib.dump(model, OUT)
print("saved", OUT)
