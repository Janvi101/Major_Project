from pathlib import Path
import numpy as np
import cv2
import mediapipe as mp

ROOT = Path(__file__).resolve().parent
DATASET = ROOT / "dataset"
OUT = ROOT / "processed"
OUT.mkdir(exist_ok=True)
EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ALIASES = {"train": ("training", "train"), "validation": ("validation", "valid", "val"), "test": ("testing", "test")}
mp_hands = mp.solutions.hands

def find_split(key):
    for p in DATASET.rglob("*"):
        if not p.is_dir():
            continue
        name = p.name.lower().replace("_", " ").strip()
        if any(name == a or name.startswith(a + " ") or name.startswith(a + "(") for a in ALIASES[key]):
            if any(c.is_dir() for c in p.iterdir()):
                return p
    raise FileNotFoundError(f"Cannot find {key} split under {DATASET}")

def normalize(hand):
    pts = np.array([[lm.x, lm.y, lm.z] for lm in hand.landmark], dtype=np.float32)
    pts -= pts[0]
    scale = float(np.max(np.abs(pts)))
    if scale > 1e-6:
        pts /= scale
    return pts.reshape(-1)

def vector_from_result(result):
    # Stable 126-value layout: Left hand (63), Right hand (63).
    slots = {"Left": np.zeros(63, np.float32), "Right": np.zeros(63, np.float32)}
    if not result.multi_hand_landmarks:
        return None
    handedness = result.multi_handedness or []
    for i, hand in enumerate(result.multi_hand_landmarks):
        side = None
        if i < len(handedness) and handedness[i].classification:
            side = handedness[i].classification[0].label
        if side not in slots or np.any(slots[side]):
            side = "Left" if not np.any(slots["Left"]) else "Right"
        if not np.any(slots[side]):
            slots[side] = normalize(hand)
    return np.concatenate([slots["Left"], slots["Right"]]).astype(np.float32)

def class_dirs(split):
    return sorted([p for p in split.iterdir() if p.is_dir() and len(p.name.strip()) == 1
                   and p.name.strip().upper() in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], key=lambda p: p.name.upper())

def process(key, hands):
    split = find_split(key)
    folders = class_dirs(split)
    if not folders:
        raise RuntimeError(f"No A-Z class folders found in {split}")
    xs, ys = [], []
    classes = [p.name.upper() for p in folders]
    print(f"\n[{key}] {split}")
    for ci, folder in enumerate(folders):
        paths = [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in EXTS]
        good = 0
        for path in paths:
            img = cv2.imread(str(path))
            if img is None:
                continue
            result = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            vec = vector_from_result(result)
            if vec is not None:
                xs.append(vec); ys.append(ci); good += 1
        print(f"{folder.name}: {good}/{len(paths)} images")
    if not xs:
        raise RuntimeError(f"No hand landmarks extracted from {split}")
    X, y = np.asarray(xs, np.float32), np.asarray(ys, np.int32)
    np.savez_compressed(OUT / f"{key}.npz", X=X, y=y, classes=np.asarray(classes))
    print(f"Saved {key}: X={X.shape}, y={y.shape}")
    return classes, X.shape

def main():
    with mp_hands.Hands(static_image_mode=True, max_num_hands=2, model_complexity=0,
                        min_detection_confidence=0.5) as hands:
        a, tr = process("train", hands)
        b, va = process("validation", hands)
        c, te = process("test", hands)
    if a != b or a != c:
        raise ValueError("Class folders differ between dataset splits.")
    print(f"\nTWO-HAND EXTRACTION COMPLETE: 126 features per sample; train={tr}, validation={va}, test={te}")

if __name__ == "__main__":
    main()
