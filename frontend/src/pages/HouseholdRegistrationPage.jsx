import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

import "./HouseholdRegistrationPage.css";

/* ============================================================
   COMPONENT
============================================================ */

const HouseholdRegistrationPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    compound: "",
    houseNumber: "",
    notes: "",
  });

  const [gpsData, setGpsData] = useState({
    latitude: "",
    longitude: "",
    accuracy: "",
  });

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ==========================================================
     HANDLE INPUT CHANGE
  ========================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /* ==========================================================
     GPS ERROR MESSAGE
  ========================================================== */

  const getLocationErrorMessage = (locationError) => {
    if (!locationError) {
      return "Unable to capture your current GPS location.";
    }

    switch (locationError.code) {
      case locationError.PERMISSION_DENIED:
        return "Location permission was denied. Please allow location access and try again.";

      case locationError.POSITION_UNAVAILABLE:
        return "Your current location is unavailable. Please ensure GPS or location services are enabled.";

      case locationError.TIMEOUT:
        return "Location request timed out. Please move to an area with better GPS signal and try again.";

      default:
        return "Unable to capture your current GPS location.";
    }
  };

  /* ==========================================================
     CAPTURE GPS LOCATION
  ========================================================== */

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "GPS location is not supported by this browser."
      );
      return;
    }

    setLoadingLocation(true);
    setError("");
    setSuccess("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
          accuracy,
        } = position.coords;

        setGpsData({
          latitude,
          longitude,
          accuracy,
        });

        setSuccess(
          `GPS location captured successfully with an accuracy of ±${Number(
            accuracy
          ).toFixed(1)} metres.`
        );

        setLoadingLocation(false);
      },

      (locationError) => {
        console.error(
          "GPS CAPTURE ERROR:",
          locationError
        );

        setError(
          getLocationErrorMessage(
            locationError
          )
        );

        setLoadingLocation(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  /* ==========================================================
     VALIDATE GPS
  ========================================================== */

  const getValidatedGPS = () => {
    const latitude = Number(gpsData.latitude);
    const longitude = Number(gpsData.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    if (
      latitude < -90 ||
      latitude > 90
    ) {
      return null;
    }

    if (
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    const gps = {
      latitude,
      longitude,
    };

    if (gpsData.accuracy !== "") {
      const accuracy = Number(
        gpsData.accuracy
      );

      if (Number.isFinite(accuracy)) {
        gps.accuracy = accuracy;
      }
    }

    return gps;
  };

  /* ==========================================================
     SUBMIT HOUSEHOLD
  ========================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccess("");

    const compound =
      formData.compound.trim();

    const houseNumber =
      formData.houseNumber.trim();

    const notes =
      formData.notes.trim();

    if (!compound) {
      setError(
        "Please enter the compound name."
      );
      return;
    }

    if (!houseNumber) {
      setError(
        "Please enter the house number."
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        compound,
        houseNumber,
      };

      if (notes) {
        payload.notes = notes;
      }

      /*
       * Add GPS only when valid.
       */

      const gps = getValidatedGPS();

      if (gps) {
        payload.latitude = gps.latitude;
        payload.longitude = gps.longitude;

        if (
          gps.accuracy !== undefined
        ) {
          payload.accuracy =
            gps.accuracy;
        }
      }

      console.log(
        "CREATE HOUSEHOLD PAYLOAD:",
        payload
      );

      /*
       * IMPORTANT:
       *
       * This is the ONLY API call made by this page
       * when creating a household.
       *
       * POST /api/v1/households
       */

      const response = await api.post(
        "/households",
        payload
      );

      console.log(
        "CREATE HOUSEHOLD RESPONSE:",
        response.data
      );

      if (
        !response.data?.success ||
        !response.data?.data
      ) {
        setError(
          response.data?.message ||
            "Unable to create household."
        );
        return;
      }

      const household =
        response.data.data;

      const householdObjectId =
        household?._id ||
        household?.id;

      if (!householdObjectId) {
        setError(
          "Household was created successfully, but the household ID was not returned by the server."
        );
        return;
      }

      setSuccess(
        household.householdId
          ? `Household ${household.householdId} created successfully.`
          : "Household created successfully."
      );

      /*
       * Navigate directly to the newly-created
       * household record.
       */

      window.setTimeout(() => {
        navigate(
          `/households/${householdObjectId}`,
          {
            replace: true,
          }
        );
      }, 700);
    } catch (err) {
      console.error(
        "CREATE HOUSEHOLD ERROR:",
        err
      );

      const serverMessage =
        err.response?.data?.message;

      if (err.response?.status === 400) {
        setError(
          serverMessage ||
            "The household information submitted is invalid."
        );
      } else if (
        err.response?.status === 401
      ) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else if (
        err.response?.status === 403
      ) {
        setError(
          serverMessage ||
            "You are not authorized to register households."
        );
      } else {
        setError(
          serverMessage ||
            err.message ||
            "Unable to create household."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     CLEAR GPS
  ========================================================== */

  const clearGPS = () => {
    setGpsData({
      latitude: "",
      longitude: "",
      accuracy: "",
    });

    setSuccess("");
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="dashboard-page household-registration-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">

        <div>

          <div className="breadcrumb">
            TA-HOSS LOG / Households / Register
          </div>

          <h1>
            Register New Household
          </h1>

          <p>
            Create a new household record
            for Ta-hoss Community.
          </p>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          ← Back
        </button>

      </div>

      {/* =====================================================
          FORM
      ====================================================== */}

      <section className="dashboard-panel household-registration-form">

        <div className="panel-header">

          <div>

            <h2>
              Household Information
            </h2>

            <p>
              Enter the household details
              below.
            </p>

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="dashboard-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* BASIC INFORMATION */}

          <div className="form-grid">

            <div className="form-group">

              <label htmlFor="compound">
                Compound *
              </label>

              <input
                id="compound"
                type="text"
                name="compound"
                value={formData.compound}
                onChange={handleChange}
                placeholder="Enter compound name"
                required
                disabled={submitting}
                autoComplete="off"
              />

            </div>

            <div className="form-group">

              <label htmlFor="houseNumber">
                House Number *
              </label>

              <input
                id="houseNumber"
                type="text"
                name="houseNumber"
                value={formData.houseNumber}
                onChange={handleChange}
                placeholder="Example: TH-001"
                required
                disabled={submitting}
                autoComplete="off"
              />

            </div>

          </div>

          {/* NOTES */}

          <div className="form-group">

            <label htmlFor="notes">
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional household information..."
              rows={4}
              disabled={submitting}
            />

          </div>

          {/* GPS */}

          <div className="gps-section">

            <div className="gps-header">

              <div>

                <h3>
                  GPS Location
                </h3>

                <p>
                  Capture the current
                  household location for
                  community mapping.
                </p>

              </div>

              <div className="gps-actions">

                {gpsData.latitude !== "" && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={clearGPS}
                    disabled={
                      loadingLocation ||
                      submitting
                    }
                  >
                    Clear GPS
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={captureLocation}
                  disabled={
                    loadingLocation ||
                    submitting
                  }
                >
                  {loadingLocation
                    ? "Capturing..."
                    : gpsData.latitude !== ""
                    ? "📍 Recapture GPS"
                    : "📍 Capture GPS"}
                </button>

              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">

                <label>
                  Latitude
                </label>

                <input
                  type="text"
                  value={gpsData.latitude}
                  readOnly
                  placeholder="Not captured"
                />

              </div>

              <div className="form-group">

                <label>
                  Longitude
                </label>

                <input
                  type="text"
                  value={gpsData.longitude}
                  readOnly
                  placeholder="Not captured"
                />

              </div>

              <div className="form-group">

                <label>
                  GPS Accuracy
                </label>

                <input
                  type="text"
                  value={
                    gpsData.accuracy !== ""
                      ? `±${Number(
                          gpsData.accuracy
                        ).toFixed(
                          1
                        )} metres`
                      : ""
                  }
                  readOnly
                  placeholder="Not captured"
                />

              </div>

            </div>

            {gpsData.latitude !== "" && (
              <div className="gps-status-message">
                ✓ GPS coordinates are ready
                and will be attached to this
                household record.
              </div>
            )}

          </div>

          {/* ACTIONS */}

          <div className="form-actions">

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Creating Household..."
                : "Create Household"}
            </button>

          </div>

        </form>

      </section>

    </div>
  );
};

export default HouseholdRegistrationPage;