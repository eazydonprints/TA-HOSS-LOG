import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import api from "../services/api";

import {
  biometricLogin,
  checkBiometricAvailability,
} from "../services/biometricService";

import { useAuth } from "../context/AuthContext";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  /* =========================================================
      STATE
  ========================================================= */

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Toggle state for password visibility

  const [rememberMe, setRememberMe] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");

  const [fingerprintMode, setFingerprintMode] = useState(false);

  /* =========================================================
      CHECK DEVICE BIOMETRIC SUPPORT
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const checkDevice = async () => {
      try {
        const result = await checkBiometricAvailability();

        if (!mounted) {
          return;
        }

        const available = Boolean(
          result?.supported &&
          result?.platformAvailable &&
          result?.secureContext
        );

        setBiometricAvailable(available);

        setBiometricMessage(
          result?.message || ""
        );

      } catch (err) {
        if (!mounted) {
          return;
        }

        setBiometricAvailable(false);

        setBiometricMessage(
          err?.message || ""
        );
      }
    };

    checkDevice();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
      SWITCH LOGIN METHOD
  ========================================================= */

  const toggleFingerprintMode = () => {
    if (!biometricAvailable) {
      return;
    }

    setError("");
    setBiometricMessage("");

    setFingerprintMode((previous) => !previous);
  };

  /* =========================================================
      ROUTE USER
  ========================================================= */

  const routeUser = (user) => {
    if (user?.role === "super_admin") {
      navigate("/");
    } else if (user?.accountType === "public") {
      navigate("/public");
    } else {
      navigate("/");
    }
  };

  /* =========================================================
      NORMAL / MAIN LOGIN
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fingerprintMode) {
      await handleBiometricLogin();
      return;
    }

    setError("");
    setBiometricMessage("");
    setLoading(true);

    try {
      const response = await api.post(
        "/auth/login",
        {
          identifier: identifier.trim(),
          password,
        }
      );

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error(
          "The server did not return valid login information."
        );
      }

      await login(token, user);

      routeUser(user);

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
      BIOMETRIC LOGIN
  ========================================================= */

  const handleBiometricLogin = async () => {
    setError("");
    setBiometricMessage("");
    setBiometricLoading(true);

    try {
      if (!identifier.trim()) {
        throw new Error(
          "Enter your username, email, or phone number first, then tap the fingerprint icon."
        );
      }

      const result = await biometricLogin(
        identifier.trim()
      );

      if (!result?.token) {
        throw new Error(
          "Biometric authentication succeeded, but no login token was returned."
        );
      }

      if (!result?.user) {
        throw new Error(
          "Biometric authentication succeeded, but user information was not returned."
        );
      }

      await login(
        result.token,
        result.user
      );

      routeUser(result.user);

    } catch (err) {
      console.error(
        "BIOMETRIC LOGIN ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Fingerprint login failed. Please try again."
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  /* =========================================================
      RENDER
  ========================================================= */

  return (
    <div className="login-page">

      {/* =====================================================
          LOGIN CARD
      ===================================================== */}

      <div className="login-card">

        <div className="login-logo-container">
          <img
            src="/ta-hoss-logo.png"
            alt="TA-HOSS LOG"
            className="login-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <div className="login-header">
          <h1 className="login-title">
            {fingerprintMode ? "biometric login" : "login"}
          </h1>

          <p className="login-subtitle">
            {fingerprintMode
              ? "Use your registered fingerprint to access your account."
              : "Sign in to access TA-HOSS LOG."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          <div className="input-group">
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              placeholder="username, email or phone"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </div>

          {/* =================================================
              PASSWORD FIELD WITH EYE ICON TOGGLE
          ================================================= */}

          {!fingerprintMode && (
            <div className="input-group password-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  /* Eye Off Icon (Hide) */
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="eye-icon"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye Icon (Show) */
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="eye-icon"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {!fingerprintMode && (
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(
                      e.target.checked
                    )
                  }
                />
                <span>remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                forget password
              </Link>
            </div>
          )}

          {fingerprintMode && (
            <div className="fingerprint-info">
              <div className="fingerprint-info-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 11.5C10.62 11.5 9.5 12.62 9.5 14C9.5 17.25 8.75 19.4 7.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7.5C8.41 7.5 5.5 10.41 5.5 14C5.5 17.1 4.75 19.45 3.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4C6.48 4 2 8.48 2 14C2 16.8 1.4 19.1 0.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 11.5C13.38 11.5 14.5 12.62 14.5 14C14.5 17.25 15.25 19.4 16.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7.5C15.59 7.5 18.5 10.41 18.5 14C18.5 17.1 19.25 19.45 20.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4C17.52 4 22 8.48 22 14C22 16.8 22.6 19.1 23.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 11.5V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="fingerprint-info-text">
                <strong>Fingerprint authentication</strong>
                <span>Tap Login to authenticate using your device.</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="login-error"
              role="alert"
              aria-live="polite"
            >
              <span className="login-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          <div className="login-action-row">
            <button
              type="submit"
              className={`login-submit-btn ${
                fingerprintMode ? "fingerprint-login-active" : ""
              }`}
              disabled={
                loading ||
                biometricLoading ||
                (fingerprintMode && !biometricAvailable)
              }
            >
              {fingerprintMode ? (
                biometricLoading ? (
                  <>
                    <span className="button-spinner" />
                    verifying...
                  </>
                ) : (
                  <>
                    <span className="button-fingerprint-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 11.5C10.62 11.5 9.5 12.62 9.5 14C9.5 17.25 8.75 19.4 7.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 7.5C8.41 7.5 5.5 10.41 5.5 14C5.5 17.1 4.75 19.45 3.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 4C6.48 4 2 8.48 2 14C2 16.8 1.4 19.1 0.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 11.5C13.38 11.5 14.5 12.62 14.5 14C14.5 17.25 15.25 19.4 16.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 7.5C15.59 7.5 18.5 10.41 18.5 14C18.5 17.1 19.25 19.45 20.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 4C17.52 4 22 8.48 22 14C22 16.8 22.6 19.1 23.5 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 11.5V21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    login with fingerprint
                  </>
                )
              ) : loading ? (
                <>
                  <span className="button-spinner" />
                  logging in...
                </>
              ) : (
                "login"
              )}
            </button>

            {biometricAvailable && (
              <button
                type="button"
                className={`fingerprint-switch ${
                  fingerprintMode ? "active" : ""
                }`}
                onClick={toggleFingerprintMode}
                disabled={loading || biometricLoading}
                title={
                  fingerprintMode
                    ? "Switch to password login"
                    : "Login with fingerprint"
                }
                aria-label={
                  fingerprintMode
                    ? "Switch to password login"
                    : "Login with fingerprint"
                }
                aria-pressed={fingerprintMode}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fingerprint-icon"
                  aria-hidden="true"
                >
                  <path
                    d="M12 11.5C10.62 11.5 9.5 12.62 9.5 14C9.5 17.25 8.75 19.4 7.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7.5C8.41 7.5 5.5 10.41 5.5 14C5.5 17.1 4.75 19.45 3.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4C6.48 4 2 8.48 2 14C2 16.8 1.4 19.1 0.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 11.5C13.38 11.5 14.5 12.62 14.5 14C14.5 17.25 15.25 19.4 16.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7.5C15.59 7.5 18.5 10.41 18.5 14C18.5 17.1 19.25 19.45 20.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4C17.52 4 22 8.48 22 14C22 16.8 22.6 19.1 23.5 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 11.5V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {fingerprintMode && biometricMessage && (
            <div
              className={`biometric-status ${
                biometricAvailable ? "available" : "unavailable"
              }`}
              role="status"
            >
              {biometricMessage}
            </div>
          )}
        </form>

        <p className="register-text">
          Dont have an account <Link to="/signup">register</Link>
        </p>

        <div className="login-community-info">
          <span>TA-HOSS COMMUNITY — Riyom LGA, Plateau State</span>
        </div>

      </div>

      <footer className="developer-footer">
        <span>Developed by Diyak Ezekiel Dalyop</span>
        <span className="footer-separator">•</span>
        <span>© TA-HOSS LOG 2026</span>
      </footer>

    </div>
  );
};

export default Login;