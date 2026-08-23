import CameraView from "../components/CameraView";

function Translator() {
  return (
    <main className="translator-page">
      <div className="translator-container">

        <div className="translator-heading">
          <span>ISL TRANSLATOR</span>

          <h1>
            Indian Sign Language
            <br />
            Non-Manual Feature Recognition
          </h1>

          <p>
            Use your camera to capture facial expressions,
            head movements, and body posture.
          </p>
        </div>

        <div className="translator-grid">

          <section className="translator-card">
            <CameraView />
          </section>

          <section className="translator-card recognition-card">

            <div className="recognition-header">
              <div>
                <h2>AI Recognition</h2>

                <p>
                  Recognition results will appear here.
                </p>
              </div>

              <span className="ai-status">
                ● Waiting
              </span>
            </div>

            <div className="recognition-results">

              <div className="recognition-item">
                <span>Facial Expression</span>
                <strong>Waiting for AI...</strong>
              </div>

              <div className="recognition-item">
                <span>Head Movement</span>
                <strong>Waiting for AI...</strong>
              </div>

              <div className="recognition-item">
                <span>Body Posture</span>
                <strong>Waiting for AI...</strong>
              </div>

            </div>

            <div className="text-output">

              <div className="text-output-header">
                <h3>Recognized Text</h3>
                <button>Copy</button>
              </div>

              <div className="text-output-content">
                Your translated text will appear here.
              </div>

            </div>

          </section>

        </div>

      </div>
    </main>
  );
}

export default Translator;