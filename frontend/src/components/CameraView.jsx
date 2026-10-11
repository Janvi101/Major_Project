import { useEffect, useRef, useState } from "react";

import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

import api from "../services/api";

function CameraView({ onStatusChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // MediaPipe references
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(0);

  // ==================================================
  // 30-FRAME SEQUENCE BUFFER
  // ==================================================

  const sequenceRef = useRef([]);

  // Prevent multiple predictions at the same time
  const isPredictingRef = useRef(false);

  // ==================================================
  // UI STATE
  // ==================================================

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [handsDetected, setHandsDetected] = useState(0);
  const [sequenceLength, setSequenceLength] = useState(0);
  const [prediction, setPrediction] = useState("");
  const [predictionScore, setPredictionScore] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Send status updates up to Translator.jsx whenever any value changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        cameraActive,
        handsDetected,
        sequenceLength,
        prediction,
        predictionScore,
        isPredicting,
      });
    }
  }, [
    cameraActive,
    handsDetected,
    sequenceLength,
    prediction,
    predictionScore,
    isPredicting,
    onStatusChange,
  ]);

  // ==================================================
  // CONVERT HANDS INTO 126 FEATURES (WRIST-CENTERED)
  // ==================================================

  const extractFrameFeatures = (result) => {
    const leftHand = new Array(63).fill(0);
    const rightHand = new Array(63).fill(0);

    // No hands detected
    if (!result.landmarks || result.landmarks.length === 0) {
      return [...leftHand, ...rightHand];
    }

    result.landmarks.forEach((hand, handIndex) => {
      const handedness = result.handednesses?.[handIndex]?.[0];
      const categoryName = handedness?.categoryName;

      // Subtract wrist (hand[0]) to match training preprocessing
      const handFeatures = [];
      const wrist = hand[0];

      hand.forEach((landmark) => {
        handFeatures.push(landmark.x - wrist.x);
        handFeatures.push(landmark.y - wrist.y);
        handFeatures.push(landmark.z - wrist.z);
      });

      if (handFeatures.length !== 63) {
        return;
      }

      if (categoryName === "Left") {
        for (let i = 0; i < 63; i++) {
          leftHand[i] = handFeatures[i];
        }
      } else if (categoryName === "Right") {
        for (let i = 0; i < 63; i++) {
          rightHand[i] = handFeatures[i];
        }
      }
    });

    return [...leftHand, ...rightHand];
  };

  // ==================================================
  // SEND 30 FRAME SEQUENCE TO BACKEND
  // ==================================================

  const sendSequenceForPrediction = async (sequence) => {
    if (isPredictingRef.current) {
      return;
    }

    try {
      isPredictingRef.current = true;
      setIsPredicting(true);

      const response = await api.post("/predict", {
        sequence: sequence,
      });

      if (response.data.success) {
        setPrediction(response.data.prediction);
        setPredictionScore(response.data.score);
      }
    } catch (err) {
      console.error("AI PREDICTION ERROR:", err);
      setError("Unable to get prediction from the AI model.");
    } finally {
      isPredictingRef.current = false;
      setIsPredicting(false);
    }
  };

  // ==================================================
  // ADD FRAME TO SEQUENCE
  // ==================================================

  const addFrameToSequence = (features) => {
    if (features.length !== 126) return;

    sequenceRef.current.push(features);

    if (sequenceRef.current.length > 30) {
      sequenceRef.current.shift();
    }

    setSequenceLength(sequenceRef.current.length);

    if (sequenceRef.current.length === 30 && !isPredictingRef.current) {
      const sequenceToSend = [...sequenceRef.current];
      sendSequenceForPrediction(sequenceToSend);
      sequenceRef.current = [];
      setSequenceLength(0);
    }
  };

  // ==================================================
  // INITIALIZE MEDIAPIPE
  // ==================================================

  const initializeHandLandmarker = async () => {
    try {
      setError("");

      const vision = await FilesetResolver.forVisionTasks("/mediapipe-wasm");

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: "/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );

      lastTimestampRef.current = 0;
      detectHands();
    } catch (err) {
      console.error("MediaPipe initialization error:", err);
      setError(
        "MediaPipe initialization failed. Please check console (F12) for details."
      );
    }
  };

  // ==================================================
  // DETECT HANDS
  // ==================================================

  const detectHands = () => {
    if (
      !videoRef.current ||
      !handLandmarkerRef.current ||
      videoRef.current.readyState < 2
    ) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    try {
      const timestamp = lastTimestampRef.current + 1;
      lastTimestampRef.current = timestamp;

      const result = handLandmarkerRef.current.detectForVideo(
        videoRef.current,
        timestamp
      );

      const count = result.landmarks?.length || 0;
      setHandsDetected(count);

      if (count > 0) {
        const features = extractFrameFeatures(result);
        addFrameToSequence(features);
      }
    } catch (err) {
      console.error("Hand detection error:", err);
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  };

  // ==================================================
  // START CAMERA
  // ==================================================

  const startCamera = async () => {
    try {
      setError("");
      sequenceRef.current = [];
      setSequenceLength(0);
      setPrediction("");
      setPredictionScore(null);
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
        setError("Unable to access the camera.");
      }
    }
  };

  // ==================================================
  // STOP CAMERA
  // ==================================================

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

    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }

    lastTimestampRef.current = 0;
    sequenceRef.current = [];
    setSequenceLength(0);
    setCameraActive(false);
    setHandsDetected(0);
    setPrediction("");
    setPredictionScore(null);
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
          <h2>Camera</h2>
          <p>Live camera stream for ISL recognition</p>
        </div>

        <div
          className={`camera-status ${
            cameraActive ? "camera-status-active" : ""
          }`}
        >
          <span></span>
          {cameraActive ? "Camera Active" : "Camera Off"}
        </div>
      </div>

      <div className="camera-screen">
        {!cameraActive && (
          <div className="camera-placeholder">
            <div className="camera-icon">📷</div>
            <h3>Camera is currently off</h3>
            <p>Click the button below to allow camera access.</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${
            cameraActive ? "camera-video-active" : ""
          }`}
        />

        {cameraActive && (
          <div className="live-badge">
            <span></span>
            LIVE
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