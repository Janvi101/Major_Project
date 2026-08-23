import { useEffect, useRef, useState } from "react";

function CameraView() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");

  const startCamera = async () => {
    try {
      setError("");

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
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Please allow camera access in your browser."
        );
      } else if (err.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to access the camera.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <div className="camera-view">

      <div className="camera-header">
        <div>
          <h2>Camera</h2>
          <p>
            Use your camera for ISL non-manual feature recognition.
          </p>
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

            <div className="camera-icon">
              📷
            </div>

            <h3>Camera is currently off</h3>

            <p>
              Click the button below to allow camera access.
            </p>

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

      {error && (
        <div className="camera-error">
          {error}
        </div>
      )}

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