import { useState, useEffect, useCallback } from "react";
import CameraView from "../components/CameraView";

const SIGN_HINTS = {
  A: "Fist with thumb extended upward next to index",
  B: "Two open flat hands touching or forming glasses",
  C: "Curved C-shape with fingers and thumb",
  D: "Index finger up touching opposite hand circle",
  E: "Index finger pointing to opposite index tip",
  F: "Dominant two fingers crossing opposite two fingers",
  G: "Two closed fists stacked together",
  H: "Two open flat palms (keep 1-inch gap for clear camera tracking)",
  I: "Index finger pointed straight up (or pinky up)",
  J: "Two hands with index tracing a J-hook",
  K: "Index finger hooked against opposite index",
  L: "Index finger and thumb forming an L shape",
  M: "3 fingers (Index, Middle, Ring) placed across the opposite palm",
  N: "2 fingers (Index, Middle) placed across the opposite palm",
  O: "Curved fingers and thumb meeting in an O",
  P: "Index pointing down against thumb",
  Q: "One hand forms a loop/circle with opposite index hooking into it",
  R: "Two fingers crossed like an R",
  S: "Fist with thumb resting over curled fingers",
  T: "Index finger touching opposite hand palm edge",
  U: "Two fingers (Index & Middle) held straight up together",
  V: "Two fingers (Index & Middle) in an open V-shape",
  W: "3 fingers spread open or interlocked open fingers",
  X: "Two index fingers crossed in an X",
  Y: "Thumb and pinky extended (or index in opposite V)",
  Z: "Flat palm with opposite fingers forming a Z",
};

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Translator() {
  const [telemetry, setTelemetry] = useState({
    cameraActive: false,
    handsDetected: 0,
    stableCount: 0,
    maxStableFrames: 5,
    isArmed: true,
    prediction: "",
    predictionScore: null,
    isPredicting: false,
  });

  const [recognizedText, setRecognizedText] = useState("");
  const [copyNotice, setCopyNotice] = useState(false);
  const [showSignGuide, setShowSignGuide] = useState(false);
  const [selectedGuideLetter, setSelectedGuideLetter] = useState("H");

  // Append committed letter to word text
  const handleLetterCommitted = useCallback((letter) => {
    setRecognizedText((prev) => prev + letter);
  }, []);

  const handleSpace = useCallback(() => {
    setRecognizedText((prev) => (prev && !prev.endsWith(" ") ? prev + " " : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setRecognizedText((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setRecognizedText("");
  }, []);

  const handleSpeak = useCallback(() => {
    if (!recognizedText.trim()) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(recognizedText.trim());
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [recognizedText]);

  const handleCopy = useCallback(() => {
    if (!recognizedText) return;
    navigator.clipboard.writeText(recognizedText).then(() => {
      setCopyNotice(true);
      setTimeout(() => setCopyNotice(false), 2000);
    });
  }, [recognizedText]);

  // Keyboard shortcut listener: SPACE, BACKSPACE, C
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleSpace();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSpace, handleBackspace, handleClear]);

  const stabilityPercentage = telemetry.maxStableFrames > 0
    ? Math.min(100, Math.round(((telemetry.stableCount || 0) / telemetry.maxStableFrames) * 100))
    : 0;

  return (
    <main className="translator-page">
      <div className="translator-container">
        {/* Page Heading */}
        <div className="translator-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <span>ISL WORD RECOGNITION</span>
            <h1>
              Indian Sign Language
              <br />
              Fingerspelling & Word Recognition
            </h1>
            <p>
              Perform ISL alphabet signs in front of your camera. Hold each sign steadily to type letters and form complete words.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSignGuide((prev) => !prev)}
            style={{
              padding: "10px 18px",
              background: showSignGuide ? "#2563eb" : "#ffffff",
              color: showSignGuide ? "#ffffff" : "#1f2937",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{showSignGuide ? "✕ Hide" : "📖 View"}</span>
            <span>ISL Sign Guide (A-Z)</span>
          </button>
        </div>

        {/* ISL Alphabet Visual Guide Drawer */}
        {showSignGuide && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>Official ISL Sign Visual Guide</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                  Click any letter to preview its exact hand posture and camera tips.
                </p>
              </div>

              {selectedGuideLetter && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f3f4f6", padding: "8px 14px", borderRadius: "8px" }}>
                  <img
                    src={`/letters/${selectedGuideLetter}.jpg`}
                    alt={selectedGuideLetter}
                    style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div>
                    <strong style={{ fontSize: "1.1rem", color: "#1d4ed8" }}>Letter {selectedGuideLetter}</strong>
                    <div style={{ fontSize: "0.8rem", color: "#4b5563", maxWidth: "340px" }}>
                      {SIGN_HINTS[selectedGuideLetter] || "Perform the sign matching the photo."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
                gap: "10px",
              }}
            >
              {ALL_LETTERS.map((letter) => (
                <div
                  key={letter}
                  onClick={() => setSelectedGuideLetter(letter)}
                  style={{
                    border: selectedGuideLetter === letter ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "6px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: selectedGuideLetter === letter ? "#eff6ff" : "#fafafa",
                    transition: "all 0.15s ease",
                  }}
                >
                  <img
                    src={`/letters/${letter}.jpg`}
                    alt={letter}
                    style={{ width: "100%", height: "55px", objectFit: "cover", borderRadius: "4px" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div style={{ fontSize: "0.9rem", fontWeight: "700", marginTop: "4px", color: selectedGuideLetter === letter ? "#1d4ed8" : "#374151" }}>
                    {letter}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="translator-grid">
          {/* Left Panel: Camera Stream with Landmark Overlay */}
          <section className="translator-card">
            <CameraView
              onStatusChange={setTelemetry}
              onLetterCommitted={handleLetterCommitted}
            />
          </section>

          {/* Right Panel: Telemetry, AI Detection & Word Assembly */}
          <section className="translator-card recognition-card">
            <div className="recognition-header">
              <div>
                <h2>Recognition Telemetry</h2>
                <p>Live detection metrics & dual-slot ISL prediction</p>
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

            {/* Live Telemetry: Hands & Stability */}
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
                  {telemetry.cameraActive ? `${telemetry.handsDetected} / 2` : "—"}
                </div>
              </div>

              {/* Sign Stability */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "500" }}>
                  SIGN STABILITY
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "4px", color: "#2563eb" }}>
                  {telemetry.cameraActive
                    ? `${telemetry.stableCount || 0} / ${telemetry.maxStableFrames}`
                    : "—"}
                </div>
              </div>
            </div>

            {/* Progress Bar for Sign Stability */}
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
                      width: `${stabilityPercentage}%`,
                      background: stabilityPercentage >= 100 ? "#10b981" : "#2563eb",
                      transition: "width 0.15s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {!telemetry.isArmed
                      ? "✓ Letter registered! Briefly withdraw hands to sign next letter."
                      : telemetry.handsDetected > 0
                      ? telemetry.prediction
                        ? `Holding "${telemetry.prediction}"...`
                        : "Detecting sign..."
                      : "Show a hand sign to the camera"}
                  </span>
                  <span>{stabilityPercentage}%</span>
                </div>
              </div>
            )}

            {/* Recognition Results */}
            <div className="recognition-results">
              <div className="recognition-item">
                <span>Model Architecture</span>
                <strong>ISL Two-Hand Alphabet (A-Z)</strong>
              </div>

              <div className="recognition-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span>Current Predicted Sign</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "4px" }}>
                    <strong
                      style={{
                        fontSize: "2rem",
                        color: telemetry.prediction ? "#2563eb" : "#9ca3af",
                      }}
                    >
                      {telemetry.prediction ? telemetry.prediction : "—"}
                    </strong>

                    {telemetry.predictionScore !== null && (
                      <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: "500" }}>
                        Confidence: {(telemetry.predictionScore * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {telemetry.prediction && (
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={`/letters/${telemetry.prediction}.jpg`}
                      alt={telemetry.prediction}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "2px solid #2563eb",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "2px" }}>ISL Ref</div>
                  </div>
                )}
              </div>
            </div>

            {/* Recognized Text Box */}
            <div className="text-output" style={{ marginTop: "20px" }}>
              <div className="text-output-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Recognized Text</h3>
                {copyNotice && (
                  <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: "600" }}>
                    Copied to clipboard!
                  </span>
                )}
              </div>

              <div
                className="text-output-content"
                style={{
                  minHeight: "70px",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  letterSpacing: "0.03em",
                  color: recognizedText ? "#111827" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  wordBreak: "break-word",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "14px 16px",
                }}
              >
                {recognizedText || "Formed words will appear here as you sign..."}
              </div>

              {/* Word Assembly Action Controls */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={handleSpace}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 14px",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  ␣ Space
                </button>

                <button
                  type="button"
                  onClick={handleBackspace}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 14px",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  ⌫ Backspace
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear
                </button>

                <button
                  type="button"
                  onClick={handleSpeak}
                  disabled={!recognizedText.trim()}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 14px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#2563eb",
                    cursor: recognizedText.trim() ? "pointer" : "not-allowed",
                    opacity: recognizedText.trim() ? 1 : 0.6,
                  }}
                >
                  🔊 Speak
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!recognizedText}
                  style={{
                    flex: "1 1 auto",
                    padding: "8px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#16a34a",
                    cursor: recognizedText ? "pointer" : "not-allowed",
                    opacity: recognizedText ? 1 : 0.6,
                  }}
                >
                  📋 Copy
                </button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  marginTop: "10px",
                  textAlign: "center",
                }}
              >
                Keyboard Shortcuts: <kbd style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>SPACE</kbd> Space &nbsp;|&nbsp; <kbd style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>BACKSPACE</kbd> Delete &nbsp;|&nbsp; <kbd style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>C</kbd> Clear
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Translator;
