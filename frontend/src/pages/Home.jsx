import { Link } from "react-router-dom";

function Home() {
  return (
    <main>

      {/* Hero Section */}
      <section className="hero">

        <div className="hero-content">

          <div className="hero-badge">
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
  Start Translating →
</Link>

            <a href="#how-it-works" className="secondary-btn">
              Learn More
            </a>

          </div>

        </div>

        <div className="hero-visual">

          <div className="camera-card">

            <div className="camera-header">
              <span className="live-dot"></span>
              AI Recognition
            </div>

            <div className="camera-placeholder">
              <div className="camera-icon">
                ◉
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

        </div>

      </section>


      {/* Features Section */}
      <section className="features-section" id="features">

        <div className="section-heading">

          <span>CORE CAPABILITIES</span>

          <h2>
            Recognizing More Than
            <br />
            Just Hand Movements
          </h2>

          <p>
            Our system focuses on the important non-manual
            features that add context and meaning to ISL.
          </p>

        </div>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              ◉
            </div>

            <h3>Facial Expressions</h3>

            <p>
              Detect facial expressions that contribute
              meaning and emotional context to communication.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ↗
            </div>

            <h3>Head Movements</h3>

            <p>
              Recognize head movements and orientation
              that influence the interpretation of signs.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ♙
            </div>

            <h3>Body Posture</h3>

            <p>
              Analyze body posture and positioning to
              provide more complete contextual understanding.
            </p>

          </div>

        </div>

      </section>


      {/* How It Works */}
      <section className="how-section" id="how-it-works">

        <div className="section-heading">

          <span>HOW IT WORKS</span>

          <h2>
            Simple. Intelligent. Accessible.
          </h2>

        </div>


        <div className="steps">

          <div className="step">

            <div className="step-number">
              01
            </div>

            <h3>Access Camera</h3>

            <p>
              Allow the application to access your camera
              and position yourself in front of it.
            </p>

          </div>


          <div className="step">

            <div className="step-number">
              02
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

            <h3>Get Text Output</h3>

            <p>
              Recognized information is converted into
              meaningful written text.
            </p>

          </div>

        </div>

      </section>


      {/* About */}
      <section className="about-section" id="about">

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
            by incorporating these meaningful visual cues.
          </p>

          <Link to="/signup" className="primary-btn">
            Try the Translator →
          </Link>

        </div>

      </section>


      {/* Footer */}
      <footer className="footer">

        <div>
          <strong>ISL<span>NMF</span></strong>
          <p>
            AI-powered Indian Sign Language
            non-manual feature recognition.
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