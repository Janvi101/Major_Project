import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

function Navbar() {
const location = useLocation();
const [menuOpen, setMenuOpen] = useState(false);

const closeMenu = () => {
setMenuOpen(false);
};

return ( <nav className="navbar"> <div className="navbar-container">


    <Link to="/" className="logo" onClick={closeMenu}>
      <div className="logo-icon">
        <Sparkles size={18} />
      </div>

      <span>
        ISL<span>NMF</span>
      </span>
    </Link>

    <div className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}>

      <Link
        to="/"
        className={location.pathname === "/" ? "active-nav-link" : ""}
        onClick={closeMenu}
      >
        Home
      </Link>

      <a href="/#how-it-works" onClick={closeMenu}>
        How It Works
      </a>

      <a href="/#features" onClick={closeMenu}>
        Features
      </a>

      <a href="/#about" onClick={closeMenu}>
        About
      </a>

      <div className="mobile-nav-buttons">
        <Link
          to="/login"
          className="login-btn"
          onClick={closeMenu}
        >
          Login
        </Link>

        <Link
          to="/signup"
          className="signup-btn"
          onClick={closeMenu}
        >
          Get Started
        </Link>
      </div>

    </div>

    <div className="nav-buttons">

      <Link to="/login" className="login-btn">
        Login
      </Link>

      <Link to="/signup" className="signup-btn">
        Get Started
      </Link>

    </div>

    <button
      className="menu-button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-label="Toggle navigation menu"
    >
      {menuOpen ? <X size={22} /> : <Menu size={22} />}
    </button>

  </div>
</nav>


);
}

export default Navbar;
