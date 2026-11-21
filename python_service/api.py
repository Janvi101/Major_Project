"""ISL recognition API. Uses the original customY_v2 model and SPACE geometry."""
from collections import deque
from pathlib import Path
from threading import Lock
import base64
import json
import time

import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
MODEL = ROOT / 'models' / 'isl_alphabet_two_hand_customY_v2.keras'
LABELS = ROOT / 'models' / 'labels_two_hand_customY_v2.json'
THRESHOLD = 0.85
STABLE_FRAMES = 4
RELEASE_FRAMES = 6
SPACE_STABLE_FRAMES = 12

app = FastAPI(title='ISL Recognition API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173',
                   'http://localhost:5174', 'http://127.0.0.1:5174',
                   'http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_methods=['*'], allow_headers=['*'],
)
mp_hands = mp.solutions.hands
model = tf.keras.models.load_model(MODEL)
labels = json.loads(LABELS.read_text(encoding='utf-8'))
if model.input_shape[-1] != 126 or model.output_shape[-1] != len(labels):
    raise RuntimeError('Model input/output dimensions do not match labels')

# MediaPipe's Hands instance and model are shared; serialize frame processing.
process_lock = Lock()
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2,
                       model_complexity=1, min_detection_confidence=.55,
                       min_tracking_confidence=.55)
sessions = {}


class FrameRequest(BaseModel):
    image: str  # JPEG data URL or base64 JPEG; frontend captures a camera frame
    session_id: str = 'default'


class SessionRequest(BaseModel):
    session_id: str = 'default'


class EditTextRequest(BaseModel):
    session_id: str = 'default'
    action: str


def normalize(hand):
    pts = np.array([[lm.x, lm.y, lm.z] for lm in hand.landmark], np.float32)
    pts -= pts[0]
    scale = float(np.max(np.abs(pts)))
    if scale > 1e-6:
        pts /= scale
    return pts.reshape(-1)


def make_vector(result):
    slots = {'Left': np.zeros(63, np.float32), 'Right': np.zeros(63, np.float32)}
    if not result.multi_hand_landmarks:
        return None
    handedness = result.multi_handedness or []
    for i, hand in enumerate(result.multi_hand_landmarks):
        side = None
        if i < len(handedness) and handedness[i].classification:
            side = handedness[i].classification[0].label
        if side not in slots or np.any(slots[side]):
            side = 'Left' if not np.any(slots['Left']) else 'Right'
        if not np.any(slots[side]):
            slots[side] = normalize(hand)
    return np.concatenate([slots['Left'], slots['Right']]).astype(np.float32)


def is_space_gesture(hand):
    p = hand.landmark
    fingers_extended = (p[8].y < p[6].y and p[12].y < p[10].y and
                        p[16].y < p[14].y and p[20].y < p[18].y)
    thumb_extended = (
        np.linalg.norm(np.array([p[4].x - p[5].x, p[4].y - p[5].y])) >
        0.35 * np.linalg.norm(np.array([p[5].x - p[17].x, p[5].y - p[17].y]))
    )
    palm_width = np.linalg.norm(np.array([p[5].x - p[17].x, p[5].y - p[17].y]))
    fingers_close = palm_width > 0 and all(
        abs(p[a].x - p[b].x) < 0.45 * palm_width
        for a, b in [(8, 12), (12, 16), (16, 20)]
    )
    return fingers_extended and thumb_extended and fingers_close


def is_right_hand(result, index):
    handedness = result.multi_handedness or []
    if index >= len(handedness):
        return False
    classification = handedness[index].classification
    return bool(classification) and classification[0].label == 'Right'


def new_state():
    return {'word': '', 'hist': deque(maxlen=STABLE_FRAMES),
            'space_hist': deque(maxlen=SPACE_STABLE_FRAMES),
            'absent': 0, 'armed': True, 'space_latched': False,
            'letter': '-', 'conf': 0.0, 'space_status': 'Not detected',
            'last_seen': time.monotonic()}


@app.get('/')
def home():
    return {'status': 'running', 'message': 'ISL Python recognition service is ready'}


@app.get('/health')
def health():
    return {'status': 'ok', 'model': 'customY_v2', 'labels': len(labels)}


@app.post('/predict')
def predict(request: FrameRequest):
    if not request.session_id or len(request.session_id) > 100:
        raise HTTPException(status_code=400, detail='Invalid session_id')
    try:
        encoded = request.image.split(',', 1)[-1]
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 4_000_000:
            raise ValueError('Image too large')
        image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError('Invalid image')
    except (ValueError, base64.binascii.Error) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Match the original realtime_app.py, which flips the webcam frame.
    image = cv2.flip(image, 1)
    with process_lock:
        now = time.monotonic()
        if request.session_id not in sessions:
            sessions[request.session_id] = new_state()
        state = sessions[request.session_id]
        state['last_seen'] = now
        # Avoid indefinite retention of abandoned sessions.
        for sid in list(sessions):
            if sid != request.session_id and now - sessions[sid]['last_seen'] > 1800:
                del sessions[sid]

        result = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        hist = state['hist']
        space_hist = state['space_hist']
        if result.multi_hand_landmarks:
            state['absent'] = 0
            hand_count = len(result.multi_hand_landmarks)
            space_detected = (hand_count == 1 and is_right_hand(result, 0)
                              and is_space_gesture(result.multi_hand_landmarks[0]))
            if space_detected:
                hist.clear()
                space_hist.append(True)
                state['letter'] = 'SPACE'
                state['conf'] = 1.0
                state['space_status'] = 'Hold open palm'
                if (state['armed'] and not state['space_latched']
                        and len(space_hist) == SPACE_STABLE_FRAMES and all(space_hist)):
                    if state['word'] and not state['word'].endswith(' '):
                        state['word'] += ' '
                    state['space_latched'] = True
                    state['armed'] = False
                    space_hist.clear()
                    hist.clear()
                    state['space_status'] = 'SPACE ADDED'
            elif state['space_latched']:
                state['letter'] = '-'
                state['space_status'] = 'Remove hand to reset'
            else:
                space_hist.clear()
                state['space_status'] = 'Not detected'
                vec = make_vector(result)
                probs = model.predict(vec.reshape(1, -1), verbose=0)[0]
                idx = int(np.argmax(probs))
                state['conf'] = float(probs[idx])
                state['letter'] = labels[idx] if state['conf'] >= THRESHOLD else '?'
                hist.append(state['letter'])
                if (state['armed'] and len(hist) == STABLE_FRAMES
                        and hist[0] != '?' and all(x == hist[0] for x in hist)):
                    state['word'] += hist[0]
                    state['armed'] = False
                    hist.clear()
        else:
            state['letter'] = '-'
            state['conf'] = 0.0
            hist.clear()
            space_hist.clear()
            state['absent'] += 1
            state['space_status'] = 'Not detected'
            if state['absent'] >= RELEASE_FRAMES:
                state['armed'] = True
                state['space_latched'] = False

        return {'prediction': state['letter'], 'confidence': state['conf'],
                'text': state['word'], 'space_status': state['space_status'],
                'hands_detected': len(result.multi_hand_landmarks or []),
                'armed': state['armed']}


@app.post('/edit-text')
def edit_text(request: EditTextRequest):
    if not request.session_id or len(request.session_id) > 100:
        raise HTTPException(status_code=400, detail='Invalid session_id')
    if request.action not in ('backspace', 'space', 'clear'):
        raise HTTPException(status_code=400, detail='Invalid action')

    with process_lock:
        if request.session_id not in sessions:
            sessions[request.session_id] = new_state()
        state = sessions[request.session_id]
        state['last_seen'] = time.monotonic()
        if request.action == 'backspace':
            state['word'] = state['word'][:-1]
        elif request.action == 'space':
            if state['word'] and not state['word'].endswith(' '):
                state['word'] += ' '
        else:
            state['word'] = ''
        return {'status': 'ok', 'text': state['word']}


@app.post('/reset')
def reset(request: SessionRequest):
    with process_lock:
        sessions[request.session_id] = new_state()
    return {'status': 'ok', 'text': ''}


@app.on_event('shutdown')
def shutdown():
    hands.close()
