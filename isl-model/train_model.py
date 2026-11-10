from pathlib import Path
import json
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "processed"
MODELS = ROOT / "models"
MODELS.mkdir(exist_ok=True)
tf.keras.utils.set_random_seed(42)

def load(name):
    p = DATA / f"{name}.npz"
    if not p.exists():
        raise FileNotFoundError(f"Missing {p}; run extract_landmarks.py first.")
    d = np.load(p, allow_pickle=False)
    return d["X"].astype(np.float32), d["y"].astype(np.int32), d["classes"].tolist()

def main():
    Xtr, ytr, classes = load("train")
    Xv, yv, cv = load("validation")
    Xt, yt, ct = load("test")
    if classes != cv or classes != ct:
        raise ValueError("Class labels differ across splits.")
    if Xtr.shape[1] != 126:
        raise ValueError(f"Expected 126 features, got {Xtr.shape[1]}. Run updated extract_landmarks.py first.")
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(126,)),
        tf.keras.layers.Dense(256, activation="relu"),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.30),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.20),
        tf.keras.layers.Dense(len(classes), activation="softmax"),
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.summary()
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
        tf.keras.callbacks.ModelCheckpoint(str(MODELS / "isl_alphabet_two_hand.keras"),
                                           monitor="val_loss", save_best_only=True),
    ]
    hist = model.fit(Xtr, ytr, validation_data=(Xv, yv), epochs=60, batch_size=64,
                     callbacks=callbacks, verbose=1)
    model = tf.keras.models.load_model(MODELS / "isl_alphabet_two_hand.keras")
    loss, acc = model.evaluate(Xt, yt, verbose=0)
    print(f"\nTWO-HAND TEST LOSS: {loss:.4f}")
    print(f"TWO-HAND TEST ACCURACY: {acc * 100:.2f}%")
    pred = np.argmax(model.predict(Xt, verbose=0), axis=1)
    print(classification_report(yt, pred, labels=list(range(len(classes))),
                               target_names=classes, zero_division=0))
    (MODELS / "labels_two_hand.json").write_text(json.dumps(classes, indent=2), encoding="utf-8")
    for metric in ("accuracy", "loss"):
        plt.figure()
        plt.plot(hist.history[metric], label="Training " + metric)
        plt.plot(hist.history["val_" + metric], label="Validation " + metric)
        plt.xlabel("Epoch"); plt.ylabel(metric.title()); plt.legend(); plt.tight_layout()
        plt.savefig(MODELS / f"two_hand_{metric}_curve.png", dpi=150); plt.close()
    np.savetxt(MODELS / "two_hand_confusion_matrix.csv",
               confusion_matrix(yt, pred, labels=list(range(len(classes)))), delimiter=",", fmt="%d")
    print("Saved models/isl_alphabet_two_hand.keras and labels_two_hand.json")

if __name__ == "__main__":
    main()
