import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./VerifyAccount.css";

const VerifyAccount = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [method, setMethod] = useState("email");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * =========================================================
   * LOAD VERIFICATION DATA
   * =========================================================
   */

  useEffect(() => {
    const storedIdentifier = sessionStorage.getItem(
      "verification_identifier"
    );

    const storedMethod = sessionStorage.getItem(
      "verification_method"
    );

    const storedUserId = sessionStorage.getItem(
      "verification_user_id"
    );

    if (storedIdentifier) {
      setUsername(storedIdentifier);
    }

    if (storedMethod) {
      setMethod(storedMethod);
    }

    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  /*
   * =========================================================
   * VERIFY ACCOUNT
   * =========================================================
   */

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!userId) {
      setError(
        "Verification session is missing. Please create your account again."
      );
      return;
    }

    if (!otp.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/verify-account",
        {
          userId,
          otp: otp.trim(),
        }
      );

      const result = response.data;

      setSuccess(
        result.message ||
          "Account verified successfully."
      );

      /*
       * Clear temporary verification data.
       */

      sessionStorage.removeItem(
        "verification_identifier"
      );

      sessionStorage.removeItem(
        "verification_method"
      );

      sessionStorage.removeItem(
        "verification_user_id"
      );

      /*
       * Redirect to login after successful verification.
       */

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to verify your account."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * RESEND OTP
   * =========================================================
   */

  const handleResend = async () => {
    setError("");
    setSuccess("");

    if (!userId) {
      setError(
        "Verification session is missing. Please create your account again."
      );
      return;
    }

    setResending(true);

    try {
      const response = await api.post(
        "/auth/resend-otp",
        {
          userId,
        }
      );

      const result = response.data;

      setSuccess(
        result.message ||
          "A new OTP has been sent."
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend OTP."
      );
    } finally {
      setResending(false);
    }
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="verify-page">

      <div className="verify-card">

        {/* LOGO */}

        <div className="verify-logo-container">
          <img
            src="/ta-hoss-logo.png"
            alt="TA-HOSS LOG"
            className="verify-logo"
          />
        </div>


        {/* TITLE */}

        <h1 className="verify-title">
          Verify Your Account
        </h1>


        {/* DESCRIPTION */}

        <p className="verify-description">
          We sent a 6-digit verification code to your{" "}

          <strong>
            {method === "phone"
              ? "phone number"
              : "email address"}
          </strong>.
        </p>


        {/* VERIFICATION FORM */}

        <form
          className="verify-form"
          onSubmit={handleVerify}
        >

          {/* USERNAME */}

          <div className="input-group">

            <label>
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Your username"
              disabled={loading}
            />

          </div>


          {/* OTP */}

          <div className="input-group">

            <label>
              Verification Code
            </label>

            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={loading}
              required
            />

          </div>


          {/* ERROR */}

          {error && (
            <div className="verify-error">
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div className="verify-success">
              {success}
            </div>
          )}


          {/* VERIFY BUTTON */}

          <button
            type="submit"
            className="verify-submit-btn"
            disabled={
              loading ||
              otp.length !== 6
            }
          >
            {loading
              ? "Verifying..."
              : "Verify Account"}
          </button>

        </form>


        {/* RESEND OTP */}

        <div className="resend-section">

          <span>
            Didn't receive the code?
          </span>

          <button
            type="button"
            className="resend-btn"
            onClick={handleResend}
            disabled={
              resending ||
              loading
            }
          >
            {resending
              ? "Sending..."
              : "Resend OTP"}
          </button>

        </div>


        {/* LOGIN */}

        <p className="verify-login-link">

          Already verified?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>


        {/* PLATFORM INFO */}

        <div className="verify-community-info">
          TA-HOSS LOG — Public Platform
        </div>

      </div>


      {/* FOOTER */}

      <footer className="developer-footer">
        Developed by Diyak Ezekiel Dalyop
        <br />
        © TA-HOSS LOG 2026
      </footer>

    </div>
  );
};

export default VerifyAccount;