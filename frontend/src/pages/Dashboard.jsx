import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* Header */}

        <div className="dashboard-header">

          <div>
            <span className="dashboard-label">
              ISL NMF PLATFORM
            </span>

            <h1>Welcome to your Dashboard</h1>

            <p>
              Start translating Indian Sign Language
              using non-manual feature recognition.
            </p>
          </div>

        </div>


        {/* Main Translation Card */}

        <section className="translation-start-card">

          <div className="translation-card-content">

            <span className="card-label">
              ISL TRANSLATOR
            </span>

            <h2>
              Translate Indian Sign Language
              with AI
            </h2>

            <p>
              Use your camera to capture facial expressions,
              head movements, and body posture. The AI system
              will analyze these features and provide meaningful
              text output.
            </p>

            <Link
              to="/translator"
              className="primary-btn"
            >
              Start Translation →
            </Link>

          </div>


          <div className="translation-card-visual">

            <div className="dashboard-camera-icon">
              📷
            </div>

            <span>
              Camera Ready
            </span>

          </div>

        </section>


        {/* Feature Cards */}

        <section className="dashboard-section">

          <div className="dashboard-section-heading">

            <div>
              <span className="card-label">
                RECOGNITION
              </span>

              <h2>
                What the system recognizes
              </h2>
            </div>

          </div>


          <div className="dashboard-feature-grid">

            <div className="dashboard-feature-card">

              <div className="dashboard-feature-icon">
                ◉
              </div>

              <h3>
                Facial Expressions
              </h3>

              <p>
                Detect facial expressions that provide
                additional context to ISL communication.
              </p>

            </div>


            <div className="dashboard-feature-card">

              <div className="dashboard-feature-icon">
                ↗
              </div>

              <h3>
                Head Movements
              </h3>

              <p>
                Analyze head movement and orientation
                during sign language communication.
              </p>

            </div>


            <div className="dashboard-feature-card">

              <div className="dashboard-feature-icon">
                ♙
              </div>

              <h3>
                Body Posture
              </h3>

              <p>
                Capture body positioning to improve
                contextual interpretation.
              </p>

            </div>

          </div>

        </section>


        {/* Quick Access */}

        <section className="quick-access">

          <div className="quick-access-card">

            <h3>
              Translation History
            </h3>

            <p>
              Your previous translations will appear here.
            </p>

            <button className="secondary-dashboard-btn">
              View History
            </button>

          </div>


          <div className="quick-access-card">

            <h3>
              Profile & Settings
            </h3>

            <p>
              Manage your account and application settings.
            </p>

            <button className="secondary-dashboard-btn">
              Open Profile
            </button>

          </div>

        </section>

      </div>

    </main>
  );
}

export default Dashboard;