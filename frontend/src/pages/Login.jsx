import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      const { token, user } = response.data;

      // Handle login flow & optional session persistence
      login(token, user);

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ================================================
            TA-HOSS LOGO
        ================================================= */}
        <div className="login-logo-container">
          <img
            src="/ta-hoss-logo.png"
            alt="TA-HOSS LOG"
            className="login-logo"
          />
        </div>

        {/* ================================================
            LOGIN TITLE
        ================================================= */}
        <h1 className="login-title">
          Login
        </h1>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Username"
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              required
            />
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(e.target.checked)
                }
              />

              <span>
                Remember me
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="register-text">
          Don't have an account?{" "}

          <Link to="/register">
            Register
          </Link>
        </p>

        <div className="login-community-info">
          <span>
            TA-HOSS COMMUNITY — Riyom LGA,
            Plateau State
          </span>
        </div>

      </div>

      <footer className="developer-footer">
        Developed by Diyak Ezekiel Dalyop
        <br />
        (C) TA-HOSS LOG 2026
      </footer>
    </div>
  );
};

export default Login;