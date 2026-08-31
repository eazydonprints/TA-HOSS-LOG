import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Signup.css";

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    verificationMethod: "email",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * =========================================================
   * HANDLE INPUT CHANGE
   * =========================================================
   */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * =========================================================
   * HANDLE SIGNUP
   * =========================================================
   */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    /*
     * Basic validation
     */

    if (
      !formData.firstname.trim() ||
      !formData.lastname.trim()
    ) {
      setError("First name and last name are required.");
      return;
    }

    if (!formData.username.trim()) {
      setError("Please choose a username.");
      return;
    }

    if (!formData.password) {
      setError("Please create a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    if (
      formData.verificationMethod === "email" &&
      !formData.email.trim()
    ) {
      setError(
        "Please provide an email address for verification."
      );
      return;
    }

    if (
      formData.verificationMethod === "phone" &&
      !formData.phone.trim()
    ) {
      setError(
        "Please provide a phone number for verification."
      );
      return;
    }

    /*
     * Build fullname exactly as expected
     * by the backend.
     */

    const fullname = [
      formData.firstname.trim(),
      formData.middlename.trim(),
      formData.lastname.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    if (!fullname) {
      setError("Please provide your full name.");
      return;
    }

    /*
     * Clear any previous verification session
     * before creating a new account.
     */

    sessionStorage.removeItem(
      "verification_user_id"
    );

    sessionStorage.removeItem(
      "verification_identifier"
    );

    sessionStorage.removeItem(
      "verification_method"
    );

    setLoading(true);

    try {
      /*
       * Send data in the exact format
       * expected by authController.signup
       */

      const response = await api.post(
        "/auth/signup",
        {
          fullname,

          username:
            formData.username.trim(),

          email:
            formData.email.trim() || null,

          phone:
            formData.phone.trim() || null,

          password:
            formData.password,

          verificationMethod:
            formData.verificationMethod,
        }
      );

      const result = response.data;

      /*
       * Backend returns:
       *
       * {
       *   success: true,
       *   user: {
       *     id,
       *     username,
       *     email,
       *     phone,
       *     verificationMethod
       *   }
       * }
       */

      if (!result.user?.id) {
        throw new Error(
          "Account was created, but the verification session could not be initialized."
        );
      }

      /*
       * Store verification information.
       *
       * VerifyAccount.jsx requires userId.
       */

      sessionStorage.setItem(
        "verification_user_id",
        result.user.id
      );

      sessionStorage.setItem(
        "verification_identifier",
        result.user.username ||
          formData.username.trim()
      );

      sessionStorage.setItem(
        "verification_method",
        result.user.verificationMethod ||
          formData.verificationMethod
      );

      setSuccess(
        result.message ||
          "Account created successfully."
      );

      /*
       * Move user to account verification.
       */

      navigate("/verify-account", {
        replace: true,
      });

    } catch (err) {
      console.error(
        "SIGNUP ERROR:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * COMPONENT UI
   * =========================================================
   */

  return (
    <div className="signup-page">

      <div className="signup-card">

        {/* LOGO */}

        <div className="signup-logo-container">
          <img
            src="/ta-hoss-logo.png"
            alt="TA-HOSS LOG"
            className="signup-logo"
          />
        </div>


        {/* TITLE */}

        <h1 className="signup-title">
          Create Account
        </h1>

        <p className="signup-subtitle">
          Join the TA-HOSS LOG public platform
        </p>


        {/* SIGNUP FORM */}

        <form
          className="signup-form"
          onSubmit={handleSubmit}
        >

          {/* NAME */}

          <div className="signup-name-grid">

            <div className="input-group">

              <label>
                First Name
              </label>

              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                placeholder="First name"
                disabled={loading}
                required
              />

            </div>


            <div className="input-group">

              <label>
                Middle Name
              </label>

              <input
                type="text"
                name="middlename"
                value={formData.middlename}
                onChange={handleChange}
                placeholder="Middle name"
                disabled={loading}
              />

            </div>

          </div>


          {/* LAST NAME */}

          <div className="input-group">

            <label>
              Last Name
            </label>

            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Last name"
              disabled={loading}
              required
            />

          </div>


          {/* USERNAME */}

          <div className="input-group">

            <label>
              Username
            </label>

            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              disabled={loading}
              required
            />

          </div>


          {/* EMAIL */}

          <div className="input-group">

            <label>
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              disabled={loading}
              required={
                formData.verificationMethod ===
                "email"
              }
            />

          </div>


          {/* PHONE */}

          <div className="input-group">

            <label>
              Phone Number
            </label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone number"
              disabled={loading}
              required={
                formData.verificationMethod ===
                "phone"
              }
            />

          </div>


          {/* VERIFICATION METHOD */}

          <div className="input-group">

            <label>
              Verify Account Through
            </label>

            <select
              name="verificationMethod"
              value={
                formData.verificationMethod
              }
              onChange={handleChange}
              disabled={loading}
            >
              <option value="email">
                Email
              </option>

              <option value="phone">
                Phone / SMS
              </option>

            </select>

          </div>


          {/* PASSWORD */}

          <div className="input-group">

            <label>
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              disabled={loading}
              required
              minLength={6}
            />

          </div>


          {/* CONFIRM PASSWORD */}

          <div className="input-group">

            <label>
              Confirm Password
            </label>

            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={loading}
              required
              minLength={6}
            />

          </div>


          {/* ERROR MESSAGE */}

          {error && (
            <div className="signup-error">
              {error}
            </div>
          )}


          {/* SUCCESS MESSAGE */}

          {success && (
            <div className="signup-success">
              {success}
            </div>
          )}


          {/* SUBMIT BUTTON */}

          <button
            type="submit"
            className="signup-submit-btn"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>


        {/* LOGIN LINK */}

        <p className="login-link-text">

          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>


        {/* PLATFORM INFO */}

        <div className="signup-community-info">
          TA-HOSS LOG — Public Platform
        </div>

      </div>


      {/* DEVELOPER FOOTER */}

      <footer className="developer-footer">
        Developed by Diyak Ezekiel Dalyop
        <br />
        © TA-HOSS LOG 2026
      </footer>

    </div>
  );
};

export default Signup;