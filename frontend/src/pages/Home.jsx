import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Camera,
  BrainCircuit,
  Hand,
  Move,
  CheckCircle2,
  Sparkles,
  Activity,
} from "lucide-react";

function Home() {
  const navigate = useNavigate();

  const handleStartTranslating = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/translator");
    } else {
      navigate("/login");
    }
  };

  return (
    <main className="home-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-background">
          <div className="gradient-orb orb-one"></div>
          <div className="gradient-orb orb-two"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={15} />
            AI-Powered Indian Sign Language Recognition
          </div>

          <h1>
            Understanding ISL
            <span> Through Hand Movements</span>
          </h1>

          <p>
            An AI-powered system that recognizes Indian
            Sign Language hand signs by analyzing hand
            shapes, hand landmarks, and movement sequences.
          </p>

          <div className="hero-buttons">
            <button onClick={handleStartTranslating} className="primary-btn" style={{ cursor: "pointer" }}>
              Start Translating
              <ArrowRight size={18} />
            </button>

            <a href="#how-it-works" className="secondary-btn">
              Explore How It Works
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <strong>Hand</strong>
              <span>Detection</span>
            </div>

            <div className="hero-stat-line"></div>

            <div>
              <strong>AI</strong>
              <span>Recognition</span>
            </div>

            <div className="hero-stat-line"></div>

            <div>
              <strong>ISL</strong>
              <span>Sign Translation</span>
            </div>
          </div>
        </div>

        {/* HERO VISUAL */}
        <div className="hero-visual">
          <div className="visual-glow"></div>

          <div className="camera-card modern-camera-card">
            <div className="camera-card-top">
              <div className="camera-ai-status">
                <span className="live-dot"></span>
                Hand Recognition
              </div>

              <Hand size={18} />
            </div>

            <div className="hero-camera-preview">
              <div className="face-scan">
                <div className="scan-corner top-left"></div>
                <div className="scan-corner top-right"></div>
                <div className="scan-corner bottom-left"></div>
                <div className="scan-corner bottom-right"></div>

                <Hand size={72} />
              </div>

              <p>Hand Sign Preview</p>
              <span>Ready for recognition</span>
            </div>

            <div className="recognition-result">
              <div>
                <small>Recognized Sign</small>
                <strong>Waiting for input</strong>
              </div>

              <div className="confidence">
                AI
              </div>
            </div>
          </div>

          <div className="floating-ai-card floating-card-one">
            <BrainCircuit size={20} />

            <div>
              <strong>AI Processing</strong>
              <span>Analyzing hand movements</span>
            </div>
          </div>

          <div className="floating-ai-card floating-card-two">
            <CheckCircle2 size={20} />

            <div>
              <strong>Hand Detection</strong>
              <span>Ready to recognize signs</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-heading">
          <span>CORE CAPABILITIES</span>

          <h2>
            Recognizing ISL
            <br />
            Hand Signs
          </h2>

          <p>
            The system focuses exclusively on hand-based
            information for Indian Sign Language recognition.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Hand size={25} />
            </div>

            <h3>Hand Landmarks</h3>

            <p>
              Detect important points on the hand, including
              fingertips and joints, to represent hand positions.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Move size={25} />
            </div>

            <h3>Hand Shapes</h3>

            <p>
              Analyze the arrangement of fingers and the
              shape of the hand to help identify a sign.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Activity size={25} />
            </div>

            <h3>Movement Sequences</h3>

            <p>
              Process sequences of hand landmark data
              to recognize signs that involve movement over time.
            </p>

            <div className="feature-arrow">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <span>HOW IT WORKS</span>

          <h2>Simple. Intelligent. Accessible.</h2>

          <p>
            Follow these steps to recognize an ISL hand sign.
          </p>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>

            <div className="step-icon">
              <Camera size={24} />
            </div>

            <h3>Access Camera</h3>

            <p>
              Allow camera access and perform the hand sign
              clearly in front of the camera.
            </p>
          </div>

          <div className="step">
            <div className="step-number">02</div>

            <div className="step-icon">
              <Hand size={24} />
            </div>

            <h3>Detect Hand Movements</h3>

            <p>
              The system detects hand landmarks and collects
              the numerical features needed for recognition.
            </p>
          </div>

          <div className="step">
            <div className="step-number">03</div>

            <div className="step-icon">
              <BrainCircuit size={24} />
            </div>

            <h3>Get Recognized Sign</h3>

            <p>
              The AI model processes the hand data and
              returns its predicted sign as text.
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="about-glow"></div>

        <div className="about-content">
          <span>OUR PURPOSE</span>

          <h2>
            Making ISL Communication
            More Accessible
          </h2>

          <p>
            Our project focuses on recognizing Indian Sign
            Language through hand movements. It combines
            camera-based hand detection with AI-based sign
            prediction to provide text output.
          </p>

          <button onClick={handleStartTranslating} className="primary-btn" style={{ cursor: "pointer" }}>
            Try the Translator
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <strong>
            ISL<span>NMF</span>
          </strong>

          <p>
            AI-powered Indian Sign Language hand movement
            recognition.
          </p>
        </div>

        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
        </div>
      </footer>
    </main>
  );
}

export default Home;