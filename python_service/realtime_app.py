
from pathlib import Path
from collections import deque
import json
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf

ROOT = Path(__file__).resolve().parent

# Original working A-Z model
MODEL = ROOT / "models" / "isl_alphabet_two_hand_customY_v2.keras"
LABELS = ROOT / "models" / "labels_two_hand_customY_v2.json"

THRESHOLD = 0.85
STABLE_FRAMES = 8
RELEASE_FRAMES = 6
SPACE_STABLE_FRAMES = 12
mp_hands = mp.solutions.hands
drawing = mp.solutions.drawing_utils


def normalize(hand):
    pts = np.array(
        [[lm.x, lm.y, lm.z] for lm in hand.landmark],
        np.float32
    )

    pts -= pts[0]
    scale = float(np.max(np.abs(pts)))

    if scale > 1e-6:
        pts /= scale

    return pts.reshape(-1)


def make_vector(result):
    slots = {
        "Left": np.zeros(63, np.float32),
        "Right": np.zeros(63, np.float32)
    }

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

    return np.concatenate(
        [slots["Left"], slots["Right"]]
    ).astype(np.float32)


def is_space_gesture(hand):
    p = hand.landmark

    # Four fingers extended
    fingers_extended = (
        p[8].y < p[6].y and
        p[12].y < p[10].y and
        p[16].y < p[14].y and
        p[20].y < p[18].y
    )

    # Thumb extended
    thumb_extended = (
        np.linalg.norm(
            np.array([p[4].x - p[5].x, p[4].y - p[5].y])
        ) >
        0.35 * np.linalg.norm(
            np.array([p[5].x - p[17].x, p[5].y - p[17].y])
        )
    )

    # Fingers reasonably close together
    palm_width = np.linalg.norm(
        np.array([p[5].x - p[17].x, p[5].y - p[17].y])
    )

    fingers_close = palm_width > 0 and all(
        abs(p[a].x - p[b].x) < 0.45 * palm_width
        for a, b in [(8, 12), (12, 16), (16, 20)]
    )

    return (
        fingers_extended
        and thumb_extended
        and fingers_close
    )


def is_right_hand(result, index):
    handedness = result.multi_handedness or []

    if index >= len(handedness):
        return False

    classification = handedness[index].classification

    return (
        bool(classification)
        and classification[0].label == "Right"
    )


def text(frame, msg, pos, scale=.65, color=(255, 255, 255)):
    cv2.putText(
        frame,
        msg,
        pos,
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        2,
        cv2.LINE_AA
    )


def main():

    if not MODEL.exists() or not LABELS.exists():
        raise FileNotFoundError(
            "Original two-hand model or labels are missing."
        )

    model = tf.keras.models.load_model(MODEL)

    labels = json.loads(
        LABELS.read_text(encoding="utf-8")
    )

    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    if not cam.isOpened():
        cam = cv2.VideoCapture(0)

    if not cam.isOpened():
        raise RuntimeError(
            "Cannot open webcam. Close other camera apps or try camera index 1."
        )

    word = ""

    hist = deque(maxlen=STABLE_FRAMES)
    space_hist = deque(maxlen=SPACE_STABLE_FRAMES)

    absent = 0
    armed = True
    space_latched = False

    letter = "-"
    conf = 0.0
    space_status = "Not detected"

    print("Original A-Z model with SPACE gesture started.")
    print("SPACE gesture: Right hand, open palm, fingers together.")
    print("Hold the gesture briefly to insert one space.")
    print("Remove your hand before inserting another space.")
    print("Keyboard: SPACE=manual space, BACKSPACE=delete, C=clear, Q=quit.")

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=0,
        min_detection_confidence=.55,
        min_tracking_confidence=.55
    ) as hands:

        while True:

            ok, frame = cam.read()

            if not ok:
                break

            frame = cv2.flip(frame, 1)

            result = hands.process(
                cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            )

            if result.multi_hand_landmarks:

                absent = 0

                for hand in result.multi_hand_landmarks:
                    drawing.draw_landmarks(
                        frame,
                        hand,
                        mp_hands.HAND_CONNECTIONS
                    )

                hand_count = len(result.multi_hand_landmarks)

                # Check for the right-hand-only SPACE gesture
                space_detected = (
                    hand_count == 1
                    and is_right_hand(result, 0)
                    and is_space_gesture(
                        result.multi_hand_landmarks[0]
                    )
                )

                if space_detected:

                    hist.clear()
                    space_hist.append(True)

                    letter = "SPACE"
                    conf = 1.0
                    space_status = "Hold open palm"

                    if (
                        armed
                        and not space_latched
                        and len(space_hist) == SPACE_STABLE_FRAMES
                        and all(space_hist)
                    ):

                        if word and not word.endswith(" "):
                            word += " "

                        space_latched = True
                        armed = False

                        space_hist.clear()
                        hist.clear()

                        space_status = "SPACE ADDED"

                elif space_latched:

                    # Do not interpret the same held gesture as a letter
                    letter = "-"
                    space_status = "Remove hand to reset"

                else:

                    space_hist.clear()
                    space_status = "Not detected"

                    # Original A-Z prediction logic
                    vec = make_vector(result)

                    probs = model.predict(
                        vec.reshape(1, -1),
                        verbose=0
                    )[0]

                    idx = int(np.argmax(probs))
                    conf = float(probs[idx])

                    letter = (
                        labels[idx]
                        if conf >= THRESHOLD
                        else "?"
                    )

                    hist.append(letter)

                    if (
                        armed
                        and len(hist) == STABLE_FRAMES
                        and hist[0] != "?"
                        and all(x == hist[0] for x in hist)
                    ):

                        word += hist[0]
                        armed = False
                        hist.clear()

            else:

                letter = "-"
                conf = 0.0

                hist.clear()
                space_hist.clear()

                absent += 1
                space_status = "Not detected"

                if absent >= RELEASE_FRAMES:
                    armed = True
                    space_latched = False

            # Display information
            cv2.rectangle(
                frame,
                (10, 10),
                (frame.shape[1] - 10, 175),
                (25, 25, 25),
                -1
            )

            text(
                frame,
                f"Prediction: {letter}",
                (25, 42),
                .8
            )

            text(
                frame,
                f"Confidence: {conf:.2f}",
                (25, 73)
            )

            text(
                frame,
                f"Text: {word[-45:]}",
                (25, 108),
                .8,
                (80, 255, 120)
            )

            text(
                frame,
                f"SPACE: {space_status}",
                (25, 140),
                .55,
                (100, 220, 255)
            )

            text(
                frame,
                "SPACE key: manual | BACKSPACE: delete | C: clear | Q: quit",
                (15, frame.shape[0] - 15),
                .42
            )

            cv2.imshow(
                "ISL Two-Hand Fingerspelling",
                frame
            )

            key = cv2.waitKey(1) & 0xFF

            if key == ord("q"):
                break

            elif key == ord("c"):
                word = ""

            elif key in (8, 127):
                word = word[:-1]

            elif key == 32:
                if word and not word.endswith(" "):
                    word += " "

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
