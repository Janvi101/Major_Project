import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link to="/" className="logo">
          ISL<span>NMF</span>
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-buttons">
          <Link to="/login" className="login-btn">
            Login
          </Link>

          <Link to="/signup" className="signup-btn">
            Get Started
          </Link>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;