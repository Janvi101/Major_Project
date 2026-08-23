import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    // Temporary navigation.
    // Backend authentication will be connected next.
    navigate("/translator");
  };

  return (
    <main className="auth-page">

      <div className="auth-card">

        <div className="auth-header">
          <span>ISL NMF</span>

          <h1>Welcome Back</h1>

          <p>
            Login to access the ISL translator.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button type="submit" className="auth-button">
            Login
          </button>

        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup">
            Create Account
          </Link>
        </div>

      </div>

    </main>
  );
}

export default Login;