from pathlib import Path
from collections import deque
import json
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf

ROOT = Path(__file__).resolve().parent
MODEL = ROOT / "models" / "isl_alphabet_two_hand.keras"
LABELS = ROOT / "models" / "labels_two_hand.json"
THRESHOLD, STABLE_FRAMES, RELEASE_FRAMES = 0.65, 6, 4
mp_hands = mp.solutions.hands
drawing = mp.solutions.drawing_utils

def normalize(hand):
    pts = np.array([[lm.x, lm.y, lm.z] for lm in hand.landmark], np.float32)
    pts -= pts[0]
    scale = float(np.max(np.abs(pts)))
    if scale > 1e-6: pts /= scale
    return pts.reshape(-1)

def make_vector(result):
    slots = {"Left": np.zeros(63, np.float32), "Right": np.zeros(63, np.float32)}
    if not result.multi_hand_landmarks: return None
    handedness = result.multi_handedness or []
    for i, hand in enumerate(result.multi_hand_landmarks):
        side = None
        if i < len(handedness) and handedness[i].classification:
            side = handedness[i].classification[0].label
        if side not in slots or np.any(slots[side]):
            side = "Left" if not np.any(slots["Left"]) else "Right"
        if not np.any(slots[side]): slots[side] = normalize(hand)
    return np.concatenate([slots["Left"], slots["Right"]]).astype(np.float32)

def analyze_hand_fingers(hand_pts_63):
    if np.all(hand_pts_63 == 0):
        return None
    pts = hand_pts_63.reshape(21, 3)
    d = np.linalg.norm(pts - pts[0], axis=1)
    loop_dist = float(np.linalg.norm(pts[8] - pts[4])) # Thumb tip (4) to Index tip (8)
    im_spread = float(np.linalg.norm(pts[12] - pts[8])) # Index tip (8) to Middle tip (12)
    d_thumb = bool(d[4] > d[2])
    d_index = bool(d[8] > d[6])
    d_middle = bool(d[12] > d[10])
    d_ring = bool(d[16] > d[14])
    d_pinky = bool(d[20] > d[18])
    return {
        "thumb": d_thumb,
        "index": d_index,
        "middle": d_middle,
        "ring": d_ring,
        "pinky": d_pinky,
        "all_open": bool(d_thumb and d_index and d_middle and d_ring and d_pinky),
        "is_two_finger": bool(d_index and d_middle and not d_ring and not d_pinky),
        "is_three_finger": bool(d_index and d_middle and d_ring and not d_pinky),
        "loop_dist": loop_dist,
        "im_spread": im_spread,
        "mid_x": float(pts[12, 0]),
        "mid_y": float(pts[12, 1]),
    }

def predict_smart(model, vec, labels):
    left_hand = analyze_hand_fingers(vec[:63])
    right_hand = analyze_hand_fingers(vec[63:])
    is_one_hand = (left_hand is None) != (right_hand is None)

    if is_one_hand:
        active_vec = vec[:63] if left_hand is not None else vec[63:]
        in_right = np.concatenate([np.zeros(63, dtype=np.float32), active_vec])
        in_left = np.concatenate([active_vec, np.zeros(63, dtype=np.float32)])

        pR = model.predict(in_right.reshape(1, -1), verbose=0)[0]
        pL = model.predict(in_left.reshape(1, -1), verbose=0)[0]

        maxR = int(np.argmax(pR))
        maxL = int(np.argmax(pL))

        if pR[maxR] >= pL[maxL]:
            probs = pR
            idx = maxR
            conf = float(pR[maxR])
        else:
            probs = pL
            idx = maxL
            conf = float(pL[maxL])
    else:
        probs_normal = model.predict(vec.reshape(1, -1), verbose=0)[0]
        score_normal = np.max(probs_normal)
        idx = int(np.argmax(probs_normal))
        conf = float(score_normal)
        probs = probs_normal

        both_open = bool(left_hand and right_hand and left_hand["all_open"] and right_hand["all_open"])
        if score_normal < 0.65 and not both_open:
            swapped_vec = np.concatenate([vec[63:], vec[:63]])
            probs_swapped = model.predict(swapped_vec.reshape(1, -1), verbose=0)[0]
            score_swapped = np.max(probs_swapped)
            if score_swapped >= 0.70 and score_swapped > score_normal + 0.15:
                idx = int(np.argmax(probs_swapped))
                conf = float(score_swapped)
                probs = probs_swapped

    letter = labels[idx]
    active = right_hand if right_hand is not None else left_hand

    # 1. ISL Q Disambiguation (Two hands: one thumb-index loop, other points index)
    if left_hand and right_hand:
        is_q_l = (left_hand["loop_dist"] < 0.16 and right_hand["index"] and not right_hand["middle"] and not right_hand["ring"] and not right_hand["pinky"])
        is_q_r = (right_hand["loop_dist"] < 0.16 and left_hand["index"] and not left_hand["middle"] and not left_hand["ring"] and not left_hand["pinky"])
        if is_q_l or is_q_r:
            letter = "Q"
            conf = max(conf, 0.96)
    # Single-hand ASL Q: Thumb and index pointed downward
    if is_one_hand and active and active["thumb"] and active["index"] and not active["middle"] and not active["ring"] and not active["pinky"] and active["mid_y"] > 0:
        letter = "Q"
        conf = max(conf, 0.95)

    # 2. ISL N & M Disambiguation (Two hands: one base/palm + 2 or 3 fingers)
    if left_hand and right_hand:
        h1, h2 = left_hand, right_hand
        is_base1 = h1["all_open"] or (not h1["is_two_finger"] and not h1["is_three_finger"])
        is_base2 = h2["all_open"] or (not h2["is_two_finger"] and not h2["is_three_finger"])
        if (is_base1 and h2["is_two_finger"]) or (is_base2 and h1["is_two_finger"]):
            letter = "N"
            conf = max(conf, 0.96)
        elif (is_base1 and h2["is_three_finger"]) or (is_base2 and h1["is_three_finger"]):
            letter = "M"
            conf = max(conf, 0.96)

    # Single-hand N Disambiguation:
    if is_one_hand and active and active["is_two_finger"] and active["im_spread"] < 0.20:
        if letter in ("N", "U", "V", "H") and active["mid_y"] >= 0:
            letter = "N"
            conf = max(conf, 0.94)

    # 3. V Disambiguation (Index & Middle spread open in wide V)
    if active and letter in ("Y", "W", "U", "H"):
        if active["index"] and active["middle"] and not active["ring"] and active["im_spread"] > 0.22:
            letter = "V"
            conf = max(conf, 0.95)

    # 4. W Disambiguation:
    # Single-hand W support (3 fingers: Index, Middle, Ring up)
    if is_one_hand and active and active["index"] and active["middle"] and active["ring"] and not active["pinky"]:
        letter = "W"
        conf = max(conf, 0.95)
    # Two-hand W support (both open palms, low asymmetry)
    if left_hand and right_hand and left_hand["all_open"] and right_hand["all_open"]:
        asym = abs(abs(left_hand["mid_x"]) - abs(right_hand["mid_x"]))
        if asym < 0.35 and letter in ("B", "Z"):
            w_idx = labels.index("W")
            if probs[w_idx] > 0.15:
                letter = "W"
                conf = max(conf, 0.92)

    # 5. Z Disambiguation: requires high asymmetry
    if left_hand and right_hand and letter == "Z":
        asym = abs(abs(left_hand["mid_x"]) - abs(right_hand["mid_x"]))
        if asym < 0.35:
            w_idx = labels.index("W")
            b_idx = labels.index("B")
            if probs[w_idx] > probs[b_idx]:
                letter = "W"
                conf = max(float(probs[w_idx]), 0.88)
            else:
                letter = "B"
                conf = max(float(probs[b_idx]), 0.88)

    # 6. S Disambiguation: Closed fist
    if active and letter in ("N", "C", "Q"):
        if not active["index"] and not active["middle"] and not active["ring"]:
            letter = "S"
            conf = max(conf, 0.95)

    # 7. ASL/ISL I support: Pinky extended alone when not O
    o_idx = labels.index("O")
    if is_one_hand and active and active["pinky"] and not active["index"] and not active["middle"] and not active["ring"] and letter != "O" and probs[o_idx] < 0.60:
        letter = "I"
        conf = max(conf, 0.96)

    # 8. H check: both hands all open
    if left_hand and right_hand and left_hand["all_open"] and right_hand["all_open"]:
        if letter in ("B", "M", "W", "G") and conf < 0.85:
            letter = "H"
            conf = max(conf, 0.92)

    return letter, conf

def text(frame, msg, pos, scale=.65, color=(255,255,255)):
    cv2.putText(frame, msg, pos, cv2.FONT_HERSHEY_SIMPLEX, scale, color, 2, cv2.LINE_AA)

def main():
    if not MODEL.exists() or not LABELS.exists():
        raise FileNotFoundError("Two-hand model missing. Run extract_landmarks.py and train_model.py first.")
    model = tf.keras.models.load_model(MODEL)
    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cam.isOpened(): cam = cv2.VideoCapture(0)
    if not cam.isOpened(): raise RuntimeError("Cannot open webcam; close other camera apps or try camera index 1.")
    word, hist, absent, armed = "", deque(maxlen=STABLE_FRAMES), 0, True
    letter, conf = "-", 0.0
    print("ISL Precision App: SPACE=space, BACKSPACE=delete, C=clear, Q=quit.")
    with mp_hands.Hands(static_image_mode=False, max_num_hands=2, model_complexity=0,
                        min_detection_confidence=.50, min_tracking_confidence=.50) as hands:
        while True:
            ok, frame = cam.read()
            if not ok: break
            frame = cv2.flip(frame, 1)
            result = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            num_hands = len(result.multi_hand_landmarks) if result.multi_hand_landmarks else 0
            if result.multi_hand_landmarks:
                absent = 0
                for hand in result.multi_hand_landmarks:
                    drawing.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)
                vec = make_vector(result)
                letter_pred, conf_pred = predict_smart(model, vec, labels)
                letter = letter_pred if conf_pred >= THRESHOLD else "?"
                conf = conf_pred
                hist.append(letter)
                if armed and len(hist) == STABLE_FRAMES and hist[0] != "?" and all(x == hist[0] for x in hist):
                    word += hist[0]; armed = False; hist.clear()
            else:
                letter, conf = "-", 0.0
                hist.clear(); absent += 1
                if absent >= RELEASE_FRAMES: armed = True

            cv2.rectangle(frame, (10,10), (frame.shape[1]-10,145), (25,25,25), -1)
            text(frame, f"Prediction: {letter} (Hands: {num_hands})", (25,42), .8)
            text(frame, f"Confidence: {conf:.2f}", (25,73))
            text(frame, f"Text: {word[-45:]}", (25,108), .8, (80,255,120))
            text(frame, "SPACE: space | BACKSPACE: delete | C: clear | Q: quit",
                 (15,frame.shape[0]-15), .45)
            cv2.imshow("ISL Precision Fingerspelling", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"): break
            if key == ord("c"): word = ""
            elif key in (8,127): word = word[:-1]
            elif key == 32 and word and not word.endswith(" "): word += " "
    cam.release(); cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
