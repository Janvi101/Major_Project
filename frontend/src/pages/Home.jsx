import { Link } from "react-router-dom";

import {
ArrowRight,
Camera,
BrainCircuit,
ScanFace,
Move,
Accessibility,
CheckCircle2,
Sparkles,
Activity,
} from "lucide-react";

function Home() {
return ( <main className="home-page">


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
        <span> Beyond Hand Movements</span>
      </h1>

      <p>
        An intelligent system designed to recognize the
        non-manual features of Indian Sign Language,
        including facial expressions, head movements,
        and body posture.
      </p>

      <div className="hero-buttons">

        <Link to="/translator" className="primary-btn">
          Start Translating
          <ArrowRight size={18} />
        </Link>

        <a href="#how-it-works" className="secondary-btn">
          Explore How It Works
        </a>

      </div>

      <div className="hero-stats">

        <div>
          <strong>3+</strong>
          <span>Visual Features</span>
        </div>

        <div className="hero-stat-line"></div>

        <div>
          <strong>AI</strong>
          <span>Powered Recognition</span>
        </div>

        <div className="hero-stat-line"></div>

        <div>
          <strong>ISL</strong>
          <span>Focused Platform</span>
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
            AI Recognition Active
          </div>

          <Activity size={18} />

        </div>

        <div className="hero-camera-preview">

          <div className="face-scan">

            <div className="scan-corner top-left"></div>
            <div className="scan-corner top-right"></div>
            <div className="scan-corner bottom-left"></div>
            <div className="scan-corner bottom-right"></div>

            <ScanFace size={72} />

          </div>

          <p>Camera Preview</p>

          <span>Ready for recognition</span>

        </div>

        <div className="recognition-result">

          <div>

            <small>Recognized Output</small>

            <strong>Welcome</strong>

          </div>

          <div className="confidence">
            94%
          </div>

        </div>

      </div>


      <div className="floating-ai-card floating-card-one">

        <BrainCircuit size={20} />

        <div>
          <strong>AI Processing</strong>
          <span>Analyzing visual features</span>
        </div>

      </div>


      <div className="floating-ai-card floating-card-two">

        <CheckCircle2 size={20} />

        <div>
          <strong>Recognition Ready</strong>
          <span>Camera connected</span>
        </div>

      </div>

    </div>

  </section>


  {/* FEATURES */}

  <section
    className="features-section"
    id="features"
  >

    <div className="section-heading">

      <span>CORE CAPABILITIES</span>

      <h2>
        Recognizing More Than
        <br />
        Just Hand Movements
      </h2>

      <p>
        Our system focuses on the important
        non-manual features that add context
        and meaning to Indian Sign Language.
      </p>

    </div>


    <div className="feature-grid">

      <div className="feature-card">

        <div className="feature-icon">
          <ScanFace size={25} />
        </div>

        <h3>Facial Expressions</h3>

        <p>
          Detect facial expressions that contribute
          meaning and emotional context to
          communication.
        </p>

        <div className="feature-arrow">
          <ArrowRight size={18} />
        </div>

      </div>


      <div className="feature-card">

        <div className="feature-icon">
          <Move size={25} />
        </div>

        <h3>Head Movements</h3>

        <p>
          Recognize head movements and orientation
          that influence the interpretation
          of signs.
        </p>

        <div className="feature-arrow">
          <ArrowRight size={18} />
        </div>

      </div>


      <div className="feature-card">

        <div className="feature-icon">
          <Accessibility size={25} />
        </div>

        <h3>Body Posture</h3>

        <p>
          Analyze body posture and positioning
          to provide more complete contextual
          understanding.
        </p>

        <div className="feature-arrow">
          <ArrowRight size={18} />
        </div>

      </div>

    </div>

  </section>


  {/* HOW IT WORKS */}

  <section
    className="how-section"
    id="how-it-works"
  >

    <div className="section-heading">

      <span>HOW IT WORKS</span>

      <h2>
        Simple. Intelligent. Accessible.
      </h2>

      <p>
        Start translating in just a few simple steps.
      </p>

    </div>


    <div className="steps">

      <div className="step">

        <div className="step-number">
          01
        </div>

        <div className="step-icon">
          <Camera size={24} />
        </div>

        <h3>Access Camera</h3>

        <p>
          Allow the application to access your
          camera and position yourself clearly
          in front of it.
        </p>

      </div>


      <div className="step">

        <div className="step-number">
          02
        </div>

        <div className="step-icon">
          <BrainCircuit size={24} />
        </div>

        <h3>AI Recognition</h3>

        <p>
          The AI system analyzes facial expressions,
          head movements and body posture.
        </p>

      </div>


      <div className="step">

        <div className="step-number">
          03
        </div>

        <div className="step-icon">
          <Activity size={24} />
        </div>

        <h3>Get Text Output</h3>

        <p>
          Recognized visual information is converted
          into meaningful written text.
        </p>

      </div>

    </div>

  </section>


  {/* ABOUT */}

  <section
    className="about-section"
    id="about"
  >

    <div className="about-glow"></div>

    <div className="about-content">

      <span>OUR PURPOSE</span>

      <h2>
        Making ISL Communication
        More Context-Aware
      </h2>

      <p>
        Non-manual features are an essential part of
        sign language communication. Our project aims
        to complement existing ISL translation systems
        by incorporating meaningful visual cues.
      </p>

      <Link
        to="/signup"
        className="primary-btn"
      >
        Try the Translator
        <ArrowRight size={18} />
      </Link>

    </div>

  </section>


  {/* FOOTER */}

  <footer className="footer">

    <div>

      <strong>
        ISL<span>NMF</span>
      </strong>

      <p>
        AI-powered Indian Sign Language
        non-manual feature recognition.
      </p>

    </div>


    <div className="footer-links">

      <a href="#features">
        Features
      </a>

      <a href="#how-it-works">
        How It Works
      </a>

      <a href="#about">
        About
      </a>

    </div>

  </footer>

</main>


);
}

export default Home;
