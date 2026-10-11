import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <span className="dashboard-label">
              ISL HAND RECOGNITION PLATFORM
            </span>

            <h1>Welcome to your Dashboard</h1>

            <p>
              Recognize Indian Sign Language using
              hand shapes and hand movement sequences.
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
              Recognize Hand Signs with AI
            </h2>

            <p>
              Use your camera to perform an ISL hand sign.
              The system detects hand landmarks, processes
              hand movement data, and displays the predicted
              sign as text.
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
              ✋
            </div>

            <span>Hand Recognition</span>
          </div>
        </section>

        {/* Recognition Features */}
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="card-label">
                RECOGNITION
              </span>

              <h2>What the system analyzes</h2>
            </div>
          </div>

          <div className="dashboard-feature-grid">
            <div className="dashboard-feature-card">
              <div className="dashboard-feature-icon">
                ✋
              </div>

              <h3>Hand Landmarks</h3>

              <p>
                Detect hand landmarks, including finger
                joints and fingertips, using hand detection.
              </p>
            </div>

            <div className="dashboard-feature-card">
              <div className="dashboard-feature-icon">
                ◉
              </div>

              <h3>Hand Shapes</h3>

              <p>
                Analyze finger arrangements and hand
                positions to help identify signs.
              </p>
            </div>

            <div className="dashboard-feature-card">
              <div className="dashboard-feature-icon">
                ↗
              </div>

              <h3>Movement Sequences</h3>

              <p>
                Collect sequential hand features and
                send them to the AI model for prediction.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="quick-access">
          <div className="quick-access-card">
            <h3>Start Recognition</h3>

            <p>
              Open the camera and perform an ISL hand sign.
            </p>

            <Link
              to="/translator"
              className="primary-btn"
            >
              Open Translator
            </Link>
          </div>

          <div className="quick-access-card">
            <h3>Profile & Settings</h3>

            <p>
              Manage your account and application settings.
            </p>

            <Link
              to="/profile"
              className="secondary-dashboard-btn"
            >
              Open Profile
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;