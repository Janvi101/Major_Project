import { useEffect, useRef, useState } from "react";

import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

import api from "../services/api";

function CameraView() {
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

  const [sequenceLength, setSequenceLength] =
    useState(0);

  const [prediction, setPrediction] =
    useState("");

  const [predictionScore, setPredictionScore] =
    useState(null);

  const [isPredicting, setIsPredicting] =
    useState(false);

  // ==================================================
  // CONVERT HANDS INTO 126 FEATURES
  // ==================================================

  const extractFrameFeatures = (result) => {
    /*
      Each hand:

      21 landmarks
      ×
      3 values (x, y, z)
      =
      63 values

      Two hands:

      63 + 63 = 126 values
    */

    const leftHand = new Array(63).fill(0);

    const rightHand = new Array(63).fill(0);

    // No hands detected
    if (
      !result.landmarks ||
      result.landmarks.length === 0
    ) {
      return [
        ...leftHand,
        ...rightHand,
      ];
    }

    result.landmarks.forEach(
      (hand, handIndex) => {

        const handedness =
          result.handednesses?.[handIndex]?.[0];

        const categoryName =
          handedness?.categoryName;

        console.log(
          `Hand ${handIndex + 1} detected as:`,
          categoryName
        );

        // ==========================================
        // CONVERT 21 LANDMARKS INTO 63 VALUES
        // ==========================================

        const handFeatures = [];

        hand.forEach((landmark) => {

          handFeatures.push(landmark.x);

          handFeatures.push(landmark.y);

          handFeatures.push(landmark.z);

        });

        // ==========================================
        // VALIDATE HAND
        // ==========================================

        if (handFeatures.length !== 63) {

          console.error(
            "Unexpected hand feature length:",
            handFeatures.length
          );

          return;
        }

        // ==========================================
        // LEFT HAND
        // ==========================================

        if (categoryName === "Left") {

          for (let i = 0; i < 63; i++) {

            leftHand[i] =
              handFeatures[i];

          }

        }

        // ==========================================
        // RIGHT HAND
        // ==========================================

        else if (categoryName === "Right") {

          for (let i = 0; i < 63; i++) {

            rightHand[i] =
              handFeatures[i];

          }

        }

        // ==========================================
        // UNKNOWN HANDEDNESS
        // ==========================================

        else {

          console.warn(
            "Could not determine handedness:",
            handedness
          );

        }

      }
    );

    // ==========================================
    // 126 FEATURES
    // LEFT 63 + RIGHT 63
    // ==========================================

    const features = [
      ...leftHand,
      ...rightHand,
    ];

    return features;
  };

  // ==================================================
  // SEND 30 FRAME SEQUENCE TO BACKEND
  // ==================================================

  const sendSequenceForPrediction = async (
    sequence
  ) => {

    // Prevent duplicate requests
    if (isPredictingRef.current) {

      console.log(
        "Prediction already running. Skipping request."
      );

      return;
    }

    try {

      isPredictingRef.current = true;

      setIsPredicting(true);

      console.log(
        "================================="
      );

      console.log(
        "SENDING SEQUENCE TO BACKEND"
      );

      console.log(
        "Number of frames:",
        sequence.length
      );

      console.log(
        "Features per frame:",
        sequence[0]?.length
      );

      console.log(
        "================================="
      );

      // ==========================================
      // SEND TO BACKEND
      // ==========================================

      const response =
        await api.post(
          "/predict",
          {
            sequence: sequence,
          }
        );

      console.log(
        "AI prediction response:",
        response.data
      );

      // ==========================================
      // SAVE PREDICTION
      // ==========================================

      if (response.data.success) {

        setPrediction(
          response.data.prediction
        );

        setPredictionScore(
          response.data.score
        );

        console.log(
          "Predicted sign:",
          response.data.prediction
        );

        console.log(
          "Prediction score:",
          response.data.score
        );

      } else {

        console.error(
          "Prediction failed:",
          response.data
        );

      }

    } catch (err) {

      console.error(
        "================================="
      );

      console.error(
        "AI PREDICTION ERROR"
      );

      console.error(
        "================================="
      );

      console.error(
        "Full error:",
        err
      );

      console.error(
        "Error response:",
        err?.response?.data
      );

      setError(
        "Unable to get prediction from the AI model."
      );

    } finally {

      isPredictingRef.current = false;

      setIsPredicting(false);

    }
  };

  // ==================================================
  // ADD FRAME TO SEQUENCE
  // ==================================================

  const addFrameToSequence = (features) => {

    // ==========================================
    // VALIDATE FRAME
    // ==========================================

    if (features.length !== 126) {

      console.error(
        "Invalid frame length:",
        features.length
      );

      return;
    }

    // ==========================================
    // ADD CURRENT FRAME
    // ==========================================

    sequenceRef.current.push(features);

    // ==========================================
    // KEEP ONLY LATEST 30 FRAMES
    // ==========================================

    if (
      sequenceRef.current.length > 30
    ) {

      sequenceRef.current.shift();

    }

    // ==========================================
    // UPDATE UI
    // ==========================================

    setSequenceLength(
      sequenceRef.current.length
    );

    // ==========================================
    // EXACTLY 30 FRAMES
    // ==========================================

    if (
      sequenceRef.current.length === 30 &&
      !isPredictingRef.current
    ) {

      console.log(
        "================================="
      );

      console.log(
        "30-FRAME SEQUENCE READY!"
      );

      console.log(
        "Number of frames:",
        sequenceRef.current.length
      );

      console.log(
        "Features per frame:",
        sequenceRef.current[0].length
      );

      console.log(
        "Sequence shape:",
        `[${sequenceRef.current.length}, ${sequenceRef.current[0].length}]`
      );

      console.log(
        "Making ONE prediction..."
      );

      console.log(
        "================================="
      );

      // ==========================================
      // COPY THE SEQUENCE
      // ==========================================

      const sequenceToSend = [
        ...sequenceRef.current,
      ];

      // ==========================================
      // SEND TO AI
      // ==========================================

      sendSequenceForPrediction(
        sequenceToSend
      );

      // ==========================================
      // CLEAR BUFFER
      // ==========================================

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

      console.log(
        "================================="
      );

      console.log(
        "Starting MediaPipe initialization..."
      );

      console.log(
        "================================="
      );

      // ==========================================
      // LOAD MEDIAPIPE WASM
      // ==========================================

      const vision =
        await FilesetResolver.forVisionTasks(
          "/mediapipe-wasm"
        );

      console.log(
        "MediaPipe WASM loaded successfully."
      );

      // ==========================================
      // CREATE HAND LANDMARKER
      // ==========================================

      handLandmarkerRef.current =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {

              modelAssetPath:
                "/hand_landmarker.task",

              delegate: "GPU",

            },

            runningMode: "VIDEO",

            numHands: 2,

          }
        );

      console.log(
        "MediaPipe Hand Landmarker initialized successfully."
      );

      lastTimestampRef.current = 0;

      // Start detection
      detectHands();

    } catch (err) {

      console.error(
        "================================="
      );

      console.error(
        "MEDIAPIPE INITIALIZATION ERROR"
      );

      console.error(
        "================================="
      );

      console.error(
        "Full error:",
        err
      );

      console.error(
        "Error name:",
        err?.name
      );

      console.error(
        "Error message:",
        err?.message
      );

      console.error(
        "Error stack:",
        err?.stack
      );

      console.error(
        "Error string:",
        String(err)
      );

      console.error(
        "================================="
      );

      setError(
        "MediaPipe initialization failed. Open F12 → Console to see the exact error."
      );

    }

  };

  // ==================================================
  // DETECT HANDS
  // ==================================================

  const detectHands = () => {

    // ==========================================
    // CHECK VIDEO + MEDIAPIPE
    // ==========================================

    if (
      !videoRef.current ||
      !handLandmarkerRef.current ||
      videoRef.current.readyState < 2
    ) {

      animationFrameRef.current =
        requestAnimationFrame(
          detectHands
        );

      return;
    }

    try {

      // ==========================================
      // INCREASING TIMESTAMP
      // ==========================================

      const timestamp =
        lastTimestampRef.current + 1;

      lastTimestampRef.current =
        timestamp;

      // ==========================================
      // DETECT HANDS
      // ==========================================

      const result =
        handLandmarkerRef.current.detectForVideo(
          videoRef.current,
          timestamp
        );

      // ==========================================
      // NUMBER OF HANDS
      // ==========================================

      const count =
        result.landmarks?.length || 0;

      setHandsDetected(count);

      // ==========================================
      // ONLY ADD FRAME WHEN HAND IS DETECTED
      // ==========================================

      if (count > 0) {

        // Convert hand landmarks
        // into 126 features

        const features =
          extractFrameFeatures(result);

        // Add frame to sequence

        addFrameToSequence(
          features
        );

      }

    } catch (err) {

      console.error(
        "Hand detection error:",
        err
      );

    }

    // ==========================================
    // CONTINUE DETECTION LOOP
    // ==========================================

    animationFrameRef.current =
      requestAnimationFrame(
        detectHands
      );

  };

  // ==================================================
  // START CAMERA
  // ==================================================

  const startCamera = async () => {

    try {

      setError("");

      // ==========================================
      // RESET SEQUENCE
      // ==========================================

      sequenceRef.current = [];

      setSequenceLength(0);

      setPrediction("");

      setPredictionScore(null);

      isPredictingRef.current = false;

      setIsPredicting(false);

      // ==========================================
      // CHECK CAMERA API
      // ==========================================

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        setError(
          "Camera API is not supported by this browser."
        );

        return;
      }

      console.log(
        "Starting camera..."
      );

      // ==========================================
      // GET CAMERA
      // ==========================================

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {

              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },

              facingMode: "user",

            },

            audio: false,

          }
        );

      streamRef.current =
        stream;

      // ==========================================
      // CONNECT CAMERA TO VIDEO
      // ==========================================

      if (videoRef.current) {

        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();

      }

      setCameraActive(true);

      console.log(
        "Camera started successfully."
      );

      // ==========================================
      // INITIALIZE MEDIAPIPE
      // ==========================================

      await initializeHandLandmarker();

    } catch (err) {

      console.error(
        "Camera error:",
        err
      );

      if (
        err.name ===
        "NotAllowedError"
      ) {

        setError(
          "Camera permission was denied. Please allow camera access in your browser."
        );

      } else if (
        err.name ===
        "NotFoundError"
      ) {

        setError(
          "No camera was found on this device."
        );

      } else {

        setError(
          "Unable to access the camera."
        );

      }

    }

  };

  // ==================================================
  // STOP CAMERA
  // ==================================================

  const stopCamera = () => {

    console.log(
      "Stopping camera..."
    );

    // ==========================================
    // STOP ANIMATION
    // ==========================================

    if (
      animationFrameRef.current
    ) {

      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current =
        null;

    }

    // ==========================================
    // STOP CAMERA STREAM
    // ==========================================

    if (
      streamRef.current
    ) {

      streamRef.current
        .getTracks()
        .forEach((track) => {

          track.stop();

        });

      streamRef.current =
        null;

    }

    // ==========================================
    // REMOVE VIDEO
    // ==========================================

    if (
      videoRef.current
    ) {

      videoRef.current.srcObject =
        null;

    }

    // ==========================================
    // CLOSE MEDIAPIPE
    // ==========================================

    if (
      handLandmarkerRef.current
    ) {

      handLandmarkerRef.current.close();

      handLandmarkerRef.current =
        null;

    }

    // ==========================================
    // RESET
    // ==========================================

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

  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {

    return () => {

      // Stop animation

      if (
        animationFrameRef.current
      ) {

        cancelAnimationFrame(
          animationFrameRef.current
        );

      }

      // Stop camera

      if (
        streamRef.current
      ) {

        streamRef.current
          .getTracks()
          .forEach((track) => {

            track.stop();

          });

      }

      // Close MediaPipe

      if (
        handLandmarkerRef.current
      ) {

        handLandmarkerRef.current.close();

      }

    };

  }, []);

  // ==================================================
  // UI
  // ==================================================

  return (

    <div className="camera-view">

      {/* ==========================================
          CAMERA HEADER
      ========================================== */}

      <div className="camera-header">

        <div>

          <h2>
            Camera
          </h2>

          <p>
            Use your camera for ISL
            non-manual feature recognition.
          </p>

        </div>

        {/* CAMERA STATUS */}

        <div
          className={`camera-status ${
            cameraActive
              ? "camera-status-active"
              : ""
          }`}
        >

          <span></span>

          {cameraActive
            ? "Camera Active"
            : "Camera Off"}

        </div>

      </div>

      {/* ==========================================
          CAMERA SCREEN
      ========================================== */}

      <div className="camera-screen">

        {!cameraActive && (

          <div className="camera-placeholder">

            <div className="camera-icon">
              📷
            </div>

            <h3>
              Camera is currently off
            </h3>

            <p>
              Click the button below to
              allow camera access.
            </p>

          </div>

        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video ${
            cameraActive
              ? "camera-video-active"
              : ""
          }`}
        />

        {/* LIVE BADGE */}

        {cameraActive && (

          <div className="live-badge">

            <span></span>

            LIVE

          </div>

        )}

      </div>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (

        <div className="camera-error">

          {error}

        </div>

      )}

      {/* ==========================================
          DETECTION STATUS
      ========================================== */}

      {cameraActive && (

        <div>

          <div>
            Hands detected: {handsDetected}
          </div>

          <div>
            Frames collected: {sequenceLength} / 30
          </div>

        </div>

      )}

      {/* ==========================================
          PREDICTION STATUS
      ========================================== */}

      {cameraActive && (

        <div
          className="prediction-status"
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "10px",
          }}
        >

          {isPredicting ? (

            <div>

              <strong>
                Predicting...
              </strong>

              <p>
                Sending 30 frames to the
                ISL AI model.
              </p>

            </div>

          ) : prediction ? (

            <div>

              <h3>
                Detected Sign
              </h3>

              <h2>
                {prediction}
              </h2>

              {predictionScore !== null && (

                <p>
                  Score:{" "}
                  {(predictionScore * 100).toFixed(2)}
                  %
                </p>

              )}

            </div>

          ) : (

            <div>

              <strong>
                Waiting for prediction
              </strong>

              <p>
                Show a sign to the camera.
              </p>

            </div>

          )}

        </div>

      )}

      {/* ==========================================
          CAMERA CONTROLS
      ========================================== */}

      <div className="camera-controls">

        {!cameraActive ? (

          <button
            className="start-camera-button"
            onClick={startCamera}
          >
            📷 Start Camera
          </button>

        ) : (

          <button
            className="stop-camera-button"
            onClick={stopCamera}
          >
            ■ Stop Camera
          </button>

        )}

      </div>

    </div>

  );
}

export default CameraView;