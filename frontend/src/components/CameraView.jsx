import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import api from "../services/api";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

const PREDICTION_INTERVAL_MS = 90;
const CONFIDENCE_THRESHOLD = 0.65;
const STABLE_FRAMES_REQUIRED = 5;
const RELEASE_FRAMES_REQUIRED = 4;

function CameraView({ onStatusChange, onLetterCommitted }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(0);

  // Prediction state refs
  const isPredictingRef = useRef(false);
  const lastPredictTimeRef = useRef(0);
  const stabilityQueueRef = useRef([]);
  const absentFramesRef = useRef(0);
  const isArmedRef = useRef(true);

  // UI state
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [handsDetected, setHandsDetected] = useState(0);
  const [currentSign, setCurrentSign] = useState("-");
  const [confidence, setConfidence] = useState(null);
  const [stableCount, setStableCount] = useState(0);
  const [isArmed, setIsArmed] = useState(true);
  const [isPredicting, setIsPredicting] = useState(false);
  const [committedFlash, setCommittedFlash] = useState("");

  // Notify parent of telemetry updates
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        cameraActive,
        handsDetected,
        stableCount,
        maxStableFrames: STABLE_FRAMES_REQUIRED,
        isArmed,
        prediction: currentSign !== "-" ? currentSign : "",
        predictionScore: confidence,
        isPredicting,
      });
    }
  }, [
    cameraActive,
    handsDetected,
    stableCount,
    isArmed,
    currentSign,
    confidence,
    isPredicting,
    onStatusChange,
  ]);

  /**
   * Normalize 21 hand landmarks:
   * 1. Subtract wrist (landmarks[0])
   * 2. Divide by max absolute coordinate (scale invariant)
   */
  const normalizeHand = (landmarks) => {
    const wrist = landmarks[0];
    const pts = landmarks.map((lm) => [lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z]);

    let maxVal = 0;
    for (const [x, y, z] of pts) {
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      const az = Math.abs(z);
      if (ax > maxVal) maxVal = ax;
      if (ay > maxVal) maxVal = ay;
      if (az > maxVal) maxVal = az;
    }

    const scale = maxVal > 1e-6 ? maxVal : 1.0;
    const flat = [];
    for (const [x, y, z] of pts) {
      flat.push(x / scale, y / scale, z / scale);
    }
    return flat; // 63 values
  };

  /**
   * Extract stable 126-feature vector: [Left 63, Right 63]
   */
  const extractFrameFeatures = (result) => {
    const slots = {
      Left: new Array(63).fill(0),
      Right: new Array(63).fill(0),
    };

    if (!result.landmarks || result.landmarks.length === 0) {
      return null;
    }

    const isSlotOccupied = (side) => slots[side].some((val) => val !== 0);

    result.landmarks.forEach((handLandmarks, i) => {
      let side = null;
      const handedness = result.handednesses?.[i]?.[0];
      if (handedness && handedness.categoryName) {
        side = handedness.categoryName;
      }

      if (!side || !slots[side] || isSlotOccupied(side)) {
        side = !isSlotOccupied("Right") ? "Right" : "Left";
      }

      if (!isSlotOccupied(side)) {
        slots[side] = normalizeHand(handLandmarks);
      }
    });

    return [...slots.Left, ...slots.Right]; // 126 values
  };

  /**
   * Draw hand landmarks & connections on overlay canvas
   */
  const drawLandmarks = (result) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.landmarks || result.landmarks.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;

    result.landmarks.forEach((landmarks) => {
      // Draw skeleton lines
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
          ctx.beginPath();
          ctx.moveTo(start.x * w, start.y * h);
          ctx.lineTo(end.x * w, end.y * h);
          ctx.stroke();
        }
      });

      // Draw landmark points
      landmarks.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, idx === 0 ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = idx === 0 ? "#f43f5e" : "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    });
  };

  /**
   * Send 126-feature vector to backend /api/predict
   */
  const sendForPrediction = async (features) => {
    if (isPredictingRef.current) return;
    const now = Date.now();
    if (now - lastPredictTimeRef.current < PREDICTION_INTERVAL_MS) return;

    try {
      isPredictingRef.current = true;
      lastPredictTimeRef.current = now;
      setIsPredicting(true);

      const response = await api.post("/predict", { features });

      if (response.data && response.data.success) {
        const predictedLabel = response.data.prediction;
        const score = response.data.score;

        setConfidence(score);

        if (score >= CONFIDENCE_THRESHOLD) {
          setCurrentSign(predictedLabel);

          // Update stability tracking
          const queue = stabilityQueueRef.current;
          queue.push(predictedLabel);
          if (queue.length > STABLE_FRAMES_REQUIRED) {
            queue.shift();
          }

          // Count consecutive matches
          let matches = 0;
          for (let i = queue.length - 1; i >= 0; i--) {
            if (queue[i] === predictedLabel) {
              matches++;
            } else {
              break;
            }
          }
          setStableCount(matches);

          // If armed and stable enough, commit letter!
          if (
            isArmedRef.current &&
            matches >= STABLE_FRAMES_REQUIRED &&
            predictedLabel !== "?"
          ) {
            if (onLetterCommitted) {
              onLetterCommitted(predictedLabel);
            }
            setCommittedFlash(predictedLabel);
            setTimeout(() => setCommittedFlash(""), 1200);

            isArmedRef.current = false;
            setIsArmed(false);
            stabilityQueueRef.current = [];
            setStableCount(0);
          }
        } else {
          setCurrentSign("?");
          stabilityQueueRef.current = [];
          setStableCount(0);
        }
      }
    } catch (err) {
      console.error("AI Prediction request failed:", err);
    } finally {
      isPredictingRef.current = false;
      setIsPredicting(false);
    }
  };

  /**
   * Continuous hand detection loop
   */
  const detectHands = useCallback(() => {
    if (
      !videoRef.current ||
      !handLandmarkerRef.current ||
      videoRef.current.readyState < 2
    ) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    try {
      const timestamp = performance.now();
      lastTimestampRef.current = timestamp;

      const result = handLandmarkerRef.current.detectForVideo(
        videoRef.current,
        timestamp
      );

      const count = result.landmarks?.length || 0;
      setHandsDetected(count);
      drawLandmarks(result);

      if (count > 0) {
        absentFramesRef.current = 0;
        const features = extractFrameFeatures(result);
        if (features && features.length === 126) {
          sendForPrediction(features);
        }
      } else {
        // Hands absent: clear candidate & check re-arming
        absentFramesRef.current++;
        if (absentFramesRef.current >= RELEASE_FRAMES_REQUIRED) {
          if (!isArmedRef.current) {
            isArmedRef.current = true;
            setIsArmed(true);
          }
          stabilityQueueRef.current = [];
          setStableCount(0);
          setCurrentSign("-");
          setConfidence(null);
        }
      }
    } catch (err) {
      console.error("Hand detection error:", err);
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  }, []);

  /**
   * Initialize MediaPipe HandLandmarker
   */
  const initializeHandLandmarker = async () => {
    try {
      setError("");
      const vision = await FilesetResolver.forVisionTasks("/mediapipe-wasm");

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      lastTimestampRef.current = 0;
      detectHands();
    } catch (err) {
      console.error("MediaPipe initialization error:", err);
      setError("MediaPipe initialization failed. Check browser console for details.");
    }
  };

  /**
   * Start Camera stream
   */
  const startCamera = async () => {
    try {
      setError("");
      stabilityQueueRef.current = [];
      absentFramesRef.current = 0;
      isArmedRef.current = true;
      setIsArmed(true);
      setStableCount(0);
      setCurrentSign("-");
      setConfidence(null);
      isPredictingRef.current = false;
      setIsPredicting(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera API is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      await initializeHandLandmarker();
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera permission was denied. Please allow camera access in your browser.");
      } else if (err.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to access the camera: " + err.message);
      }
    }
  };

  /**
   * Stop Camera stream
   */
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }

    lastTimestampRef.current = 0;
    stabilityQueueRef.current = [];
    setStableCount(0);
    setCameraActive(false);
    setHandsDetected(0);
    setCurrentSign("-");
    setConfidence(null);
    isPredictingRef.current = false;
    setIsPredicting(false);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  return (
    <div className="camera-view">
      <div className="camera-header">
        <div>
          <h2>Live ISL Camera</h2>
          <p>Real-time fingerspelling & word recognition</p>
        </div>

        <div className={`camera-status ${cameraActive ? "camera-status-active" : ""}`}>
          <span></span>
          {cameraActive ? "Camera Active" : "Camera Off"}
        </div>
      </div>

      <div className="camera-screen" style={{ position: "relative" }}>
        {!cameraActive && (
          <div className="camera-placeholder">
            <div className="camera-icon">📷</div>
            <h3>Camera is currently off</h3>
            <p>Click Start Camera to begin recognizing Indian Sign Language.</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${cameraActive ? "camera-video-active" : ""}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {cameraActive && (
          <div className="live-badge" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span></span>
            {handsDetected === 2
              ? "🟢 2 HANDS DETECTED"
              : handsDetected === 1
              ? "🟡 1 HAND DETECTED"
              : "LIVE TRACKING"}
          </div>
        )}

        {cameraActive && handsDetected === 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(17, 24, 39, 0.85)",
              color: "#fbbf24",
              fontSize: "0.75rem",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            💡 For 2-hand signs (H, M, W): Keep a small 1-inch gap so both are tracked
          </div>
        )}

        {committedFlash && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(16, 185, 129, 0.92)",
              color: "#ffffff",
              fontSize: "4rem",
              fontWeight: "800",
              borderRadius: "16px",
              padding: "20px 40px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              pointerEvents: "none",
              animation: "pulse 0.5s ease",
            }}
          >
            + {committedFlash}
          </div>
        )}
      </div>

      {error && <div className="camera-error">{error}</div>}

      <div className="camera-controls">
        {!cameraActive ? (
          <button className="start-camera-button" onClick={startCamera}>
            📷 Start Camera
          </button>
        ) : (
          <button className="stop-camera-button" onClick={stopCamera}>
            ■ Stop Camera
          </button>
        )}
      </div>
    </div>
  );
}

export default CameraView;
