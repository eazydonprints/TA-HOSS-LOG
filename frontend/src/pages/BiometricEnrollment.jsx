import {
  useEffect,
  useState,
} from "react";

import {
  checkBiometricAvailability,
  registerBiometric,
} from "../services/biometricService";


const BiometricEnrollment = ({
  onSuccess,
}) => {

  const [available, setAvailable] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* =========================================================
     CHECK DEVICE
  ========================================================= */

  useEffect(() => {

    let mounted = true;

    const checkDevice =
      async () => {

        try {

          const result =
            await checkBiometricAvailability();

          if (!mounted) {
            return;
          }

          setAvailable(
            Boolean(
              result?.supported &&
              result?.platformAvailable &&
              result?.secureContext
            )
          );

          if (
            !result?.secureContext
          ) {

            setError(
              "Biometric enrollment requires HTTPS."
            );

          } else if (
            !result?.platformAvailable
          ) {

            setError(
              "No supported fingerprint or device authenticator was detected."
            );

          }

        } catch (err) {

          if (!mounted) {
            return;
          }

          setError(
            err?.message ||
            "Unable to check biometric availability."
          );

        } finally {

          if (mounted) {
            setChecking(false);
          }
        }
      };


    checkDevice();


    return () => {
      mounted = false;
    };

  }, []);


  /* =========================================================
     ENROLL
  ========================================================= */

  const handleEnroll =
    async () => {

      setError("");

      setMessage("");

      setLoading(true);

      try {

        const result =
          await registerBiometric();

        setMessage(
          result?.message ||
          "Fingerprint authentication enabled successfully."
        );


        if (
          typeof onSuccess ===
          "function"
        ) {

          onSuccess(result);
        }

      } catch (err) {

        console.error(
          "BIOMETRIC ENROLLMENT ERROR:",
          err
        );

        setError(
          err?.message ||
          "Unable to enroll biometric authentication."
        );

      } finally {

        setLoading(false);
      }
    };


  /* =========================================================
     RENDER
  ========================================================= */

  if (checking) {

    return (
      <div>
        Checking device biometric support...
      </div>
    );
  }


  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        maxWidth: "500px",
      }}
    >

      <h3>
        Fingerprint / Device Login
      </h3>


      <p>
        Register this device so you can
        sign in using your fingerprint,
        Face ID, or other supported device
        authentication.
      </p>


      {error && (

        <div
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>

      )}


      {message && (

        <div
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          {message}
        </div>

      )}


      <button
        type="button"
        onClick={handleEnroll}
        disabled={
          loading ||
          !available
        }
        style={{
          width: "100%",
          padding: "13px",
          border: "none",
          borderRadius: "8px",
          background:
            available
              ? "#1d4ed8"
              : "#999",
          color: "#fff",
          fontWeight: "600",
          cursor:
            available
              ? "pointer"
              : "not-allowed",
        }}
      >

        {loading
          ? "Waiting for fingerprint..."
          : "🔐 Enable Fingerprint Login"}

      </button>

    </div>
  );
};


export default BiometricEnrollment;