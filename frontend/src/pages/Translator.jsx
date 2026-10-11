import { useState } from "react";
import CameraView from "../components/CameraView";

function Translator() {
  const [telemetry, setTelemetry] = useState({
    cameraActive: false,
    handsDetected: 0,
    sequenceLength: 0,
    prediction: "",
    predictionScore: null,
    isPredicting: false,
  });

  return (
    <main className="translator-page">
      <div className="translator-container">
        {/* Page Heading */}
        <div className="translator-heading">
          <span>ISL TRANSLATOR</span>

          <h1>
            Indian Sign Language
            <br />
            Hand Movement Recognition
          </h1>

          <p>
            Perform an Indian Sign Language hand sign in front of your camera to recognize it.
          </p>
        </div>

        <div className="translator-grid">
          {/* Left Panel: Camera Only */}
          <section className="translator-card">
            <CameraView onStatusChange={setTelemetry} />
          </section>

          {/* Right Panel: All Telemetry, Status & Prediction Results */}
          <section className="translator-card recognition-card">
            <div className="recognition-header">
              <div>
                <h2>Hand Sign Recognition</h2>
                <p>Live detection metrics & AI prediction</p>
              </div>

              <span
                className={`ai-status ${
                  telemetry.cameraActive ? "ai-status-active" : ""
                }`}
              >
                ● {telemetry.isPredicting
                  ? "Predicting..."
                  : telemetry.cameraActive
                  ? "Detecting"
                  : "Camera Off"}
              </span>
            </div>

            {/* Live Telemetry: Hands & Frames */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {/* Hands Detected */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "500" }}>
                  HANDS DETECTED
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginTop: "4px",
                    color: telemetry.handsDetected > 0 ? "#059669" : "#374151",
                  }}
                >
                  {telemetry.cameraActive ? telemetry.handsDetected : "—"}
                </div>
              </div>

              {/* Frames Collected */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "500" }}>
                  FRAMES COLLECTED
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "4px" }}>
                  {telemetry.cameraActive ? `${telemetry.sequenceLength} / 30` : "—"}
                </div>
              </div>
            </div>

            {/* Progress Bar for 30 Frames */}
            {telemetry.cameraActive && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#e5e7eb",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(telemetry.sequenceLength / 30) * 100}%`,
                      background: "#2563eb",
                      transition: "width 0.1s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "4px",
                    textAlign: "right",
                  }}
                >
                  {telemetry.isPredicting
                    ? "Running AI prediction..."
                    : telemetry.handsDetected > 0
                    ? "Tracking hand gesture..."
                    : "Show a sign to the camera"}
                </div>
              </div>
            )}

            {/* Recognition Results */}
            <div className="recognition-results">
              <div className="recognition-item">
                <span>Input Mode</span>
                <strong>30-Frame Movement Sequence</strong>
              </div>

              <div className="recognition-item">
                <span>Predicted Hand Sign</span>
                <strong
                  style={{
                    fontSize: "1.4rem",
                    color: telemetry.prediction ? "#2563eb" : "#374151",
                  }}
                >
                  {telemetry.isPredicting
                    ? "Predicting..."
                    : telemetry.prediction
                    ? telemetry.prediction
                    : "Waiting for sign..."}
                </strong>

                {telemetry.predictionScore !== null && (
                  <span style={{ fontSize: "0.85rem", color: "#059669" }}>
                    Confidence: {(telemetry.predictionScore * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Recognized Text Box */}
            <div className="text-output" style={{ marginTop: "20px" }}>
              <div className="text-output-header">
                <h3>Recognized Text</h3>
              </div>

              <div
                className="text-output-content"
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  color: telemetry.prediction ? "#111827" : "#9ca3af",
                }}
              >
                {telemetry.prediction
                  ? telemetry.prediction
                  : "The recognized hand sign will appear here after the AI model returns its prediction."}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Translator;