import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import islApi from "../services/islApi";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

const PREDICTION_INTERVAL_MS = 50;
const STABLE_FRAMES_REQUIRED = 8; // Python model handles stability

function CameraView({ onStatusChange, onRecognizedText, onEditReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(`isl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const captureCanvasRef = useRef(null);
  const activeRef = useRef(false);
  const requestEpochRef = useRef(0);
  const previousTextRef = useRef("");
  const editVersionRef = useRef(0);
  const editingRef = useRef(false);
  const handCandidateRef = useRef({ value: 0, count: 0 });
  const signCandidateRef = useRef({ value: "-", count: 0 });
  const recognizedTextCallbackRef = useRef(onRecognizedText);
  recognizedTextCallbackRef.current = onRecognizedText;
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(0);

  // Prediction state refs
  const isPredictingRef = useRef(false);
  const lastPredictTimeRef = useRef(0);

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

  // All manual edits go to the same Python session that recognizes signs.
  const editText = useCallback(async (action) => {
    if (!activeRef.current || editingRef.current) return;
    editingRef.current = true;
    editVersionRef.current += 1; // Invalidate an older /predict response.
    try {
      const response = await islApi.post("/edit-text", {
        session_id: sessionIdRef.current,
        action,
      });
      const text = response.data.text ?? "";
      previousTextRef.current = text;
      recognizedTextCallbackRef.current?.(text);
      setError("");
    } catch (err) {
      console.error("Text edit failed:", err);
      setError("Could not update text in Python. Please try again.");
    } finally {
      editingRef.current = false;
    }
  }, []);

  useEffect(() => {
    onEditReady?.(editText);
    return () => onEditReady?.(null);
  }, [onEditReady, editText]);

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

  // Send raw, unmirrored camera pixels to Python. Python flips the image
  // before MediaPipe, matching the original working realtime_app.py.
  const sendForPrediction = async () => {
    if (!activeRef.current || isPredictingRef.current || editingRef.current) return;
    const now = Date.now();
    if (now - lastPredictTimeRef.current < PREDICTION_INTERVAL_MS) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;

    const epoch = requestEpochRef.current;
    const editVersion = editVersionRef.current;
    try {
      isPredictingRef.current = true;
      lastPredictTimeRef.current = now;
      setIsPredicting(true);

      if (!captureCanvasRef.current) {
        captureCanvasRef.current = document.createElement("canvas");
      }
      const capture = captureCanvasRef.current;
      capture.width = 960;
capture.height = Math.round(960 * video.videoHeight / video.videoWidth);
      const ctx = capture.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, capture.width, capture.height);

      const response = await islApi.post("/predict", {
        image: capture.toDataURL("image/jpeg", 0.8),
        session_id: sessionIdRef.current,
      });

      // Ignore replies from a camera session that has been stopped/restarted.
      if (!activeRef.current || epoch !== requestEpochRef.current ||
          editVersion !== editVersionRef.current || editingRef.current) return;
      const data = response.data;
console.log("ISL DEBUG:", data);
setError("");
      const nextSign = data.prediction || "-";
      const signCandidate = signCandidateRef.current;
      signCandidate.count = signCandidate.value === nextSign ? signCandidate.count + 1 : 1;
      signCandidate.value = nextSign;
      // Smooth the display only; Python still processes every frame normally.
      if (signCandidate.count >= 2) {
  setCurrentSign(nextSign);
  setConfidence(data.confidence ?? null);
}
      setIsArmed(Boolean(data.armed));
      const nextCount = data.hands_detected ?? 0;
      const handCandidate = handCandidateRef.current;
      handCandidate.count = handCandidate.value === nextCount ? handCandidate.count + 1 : 1;
      handCandidate.value = nextCount;
      if (handCandidate.count >= 3) setHandsDetected(nextCount);

      const text = data.text ?? "";
      if (text !== previousTextRef.current) {
        const oldText = previousTextRef.current;
        previousTextRef.current = text;
        recognizedTextCallbackRef.current?.(text);
        if (text.startsWith(oldText) && text.length > oldText.length) {
          const added = text.slice(oldText.length);
          setCommittedFlash(added === " " ? "SPACE" : added);
          window.setTimeout(() => {
            if (activeRef.current && epoch === requestEpochRef.current) {
              setCommittedFlash("");
            }
          }, 1200);
        }
      }
    } catch (err) {
      if (activeRef.current && epoch === requestEpochRef.current) {
        console.error("Python recognition request failed:", err);
        setError("Cannot reach the Python recognition API on port 8000.");
      }
    } finally {
      if (epoch === requestEpochRef.current) {
        isPredictingRef.current = false;
        setIsPredicting(false);
      }
    }
  };

  // Browser MediaPipe is used only for the blue landmark overlay.
  // Python independently performs ALL recognition, including no-hand release.
  const detectHands = () => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    if (video && handLandmarkerRef.current && video.readyState >= 2) {
      try {
        const timestamp = performance.now();
        lastTimestampRef.current = timestamp;
        const result = handLandmarkerRef.current.detectForVideo(video, timestamp);
        drawLandmarks(result);
        sendForPrediction(); // Always send frames, even with zero hands.
      } catch (err) {
        console.error("Hand detection error:", err);
      }
    }
    if (activeRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  };

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
      if (activeRef.current) detectHands();
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
      requestEpochRef.current += 1;
      const epoch = requestEpochRef.current;
      activeRef.current = false;
      sessionIdRef.current = `isl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      previousTextRef.current = "";
      editVersionRef.current += 1;
      editingRef.current = false;
      handCandidateRef.current = { value: 0, count: 0 };
      signCandidateRef.current = { value: "-", count: 0 };
      setHandsDetected(0);
      setIsArmed(true);
      setStableCount(0);
      setCurrentSign("-");
      setConfidence(null);
      isPredictingRef.current = false;
      lastPredictTimeRef.current = 0;
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

      // Initialize the Python session before beginning recognition.
      await islApi.post("/reset", { session_id: sessionIdRef.current });
      if (epoch !== requestEpochRef.current) return;
      recognizedTextCallbackRef.current?.("");
      activeRef.current = true;
      setCameraActive(true);
      await initializeHandLandmarker();
    } catch (err) {
      console.error("Camera error:", err);
      activeRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (err.name === "NotAllowedError") {
        setError("Camera permission was denied. Please allow camera access in your browser.");
      } else if (err.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to start camera or Python API: " + err.message);
      }
    }
  };

  /**
   * Stop Camera stream
   */
  const stopCamera = () => {
    activeRef.current = false;
    requestEpochRef.current += 1;
    editVersionRef.current += 1;
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
      activeRef.current = false;
      requestEpochRef.current += 1;
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
          style={{
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transform: "scaleX(-1)",
}}
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
    transform: "scaleX(-1)",
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
