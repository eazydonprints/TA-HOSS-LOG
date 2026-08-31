import { useEffect, useMemo, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";

import "./ResidentProfilePage.css";

const ResidentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resident, setResident] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================================
  // LOAD RESIDENT
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadResident = async () => {
      if (!id) {
        if (mounted) {
          setError(
            "Resident ID is missing."
          );

          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/residents/${id}`
          );

        console.log(
          "RESIDENT PROFILE:",
          response.data
        );

        if (
          response.data?.success &&
          response.data?.data
        ) {
          if (mounted) {
            setResident(
              response.data.data
            );
          }
        } else {
          if (mounted) {
            setError(
              "Resident information was not found."
            );
          }
        }
      } catch (err) {
        console.error(
          "RESIDENT PROFILE ERROR:",
          err
        );

        if (mounted) {
          setError(
            err.response?.data
              ?.message ||
              "Unable to load resident profile."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResident();

    return () => {
      mounted = false;
    };
  }, [id]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "N/A";
    }

    return parsedDate.toLocaleString(
      "en-GB"
    );
  };

  const formatLabel = (value) => {
    if (!value) {
      return "N/A";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  // =========================================================
  // COMPUTED VALUES
  // =========================================================

  const fullName = useMemo(() => {
    if (!resident) {
      return "";
    }

    return [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }, [resident]);

  const householdId =
    resident?.household?._id ||
    resident?.household?.id ||
    null;

  const verificationStatus =
    resident?.verificationStatus ||
    "pending";

  const identityStatus =
    resident?.identityStatus ||
    "pending";

  const verificationClass =
    verificationStatus === "verified"
      ? "resident-status-badge resident-status-verified"
      : verificationStatus === "rejected"
        ? "resident-status-badge resident-status-rejected"
        : "resident-status-badge resident-status-pending";

  const identityClass =
    identityStatus === "active"
      ? "resident-status-badge resident-status-verified"
      : "resident-status-badge resident-status-pending";

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="resident-profile-page">
        <div className="resident-profile-loading">
          <div className="resident-profile-spinner" />

          <p>
            Loading resident profile...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="resident-profile-page">
        <div className="resident-profile-error">
          {error}
        </div>

        <button
          className="resident-profile-back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Go Back
        </button>
      </div>
    );
  }

  // =========================================================
  // EMPTY
  // =========================================================

  if (!resident) {
    return (
      <div className="resident-profile-page">
        <div className="resident-profile-empty">
          <strong>
            Resident not found
          </strong>

          <span>
            The requested resident
            could not be found.
          </span>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="resident-profile-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="resident-profile-page-header">

        <div>
          <div className="resident-profile-breadcrumb">
            TA-HOSS LOG / Residents /{" "}
            {resident.residentId}
          </div>

          <h1>
            Resident Profile
          </h1>

          <p>
            Complete registered information
            for this community member.
          </p>
        </div>

        <button
          className="resident-profile-back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>

      </div>

      {/* =====================================================
          PROFILE HEADER
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-header-card">

          <div className="resident-profile-photo">

            {resident.photo ? (
              <img
                src={resident.photo}
                alt={fullName}
              />
            ) : (
              <span>
                {resident.firstName
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "?"}
              </span>
            )}

          </div>

          <div className="resident-profile-main">

            <h2>
              {fullName ||
                "Unknown Resident"}
            </h2>

            <p>
              Resident ID:{" "}
              <strong>
                {resident.residentId ||
                  "N/A"}
              </strong>
            </p>

            <div className="resident-status-row">

              <span
                className={
                  verificationClass
                }
              >
                Verification:{" "}
                {formatLabel(
                  verificationStatus
                )}
              </span>

              <span
                className={
                  identityClass
                }
              >
                Identity:{" "}
                {formatLabel(
                  identityStatus
                )}
              </span>

              <span className="resident-status-badge resident-status-default">
                {formatLabel(
                  resident.status
                )}
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          PERSONAL INFORMATION
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Personal Information
            </h2>

            <p>
              Basic demographic information.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>First Name</span>

            <strong>
              {resident.firstName ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Middle Name</span>

            <strong>
              {resident.middleName ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Last Name</span>

            <strong>
              {resident.lastName ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Gender</span>

            <strong>
              {formatLabel(
                resident.gender
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Date of Birth</span>

            <strong>
              {formatDate(
                resident.dateOfBirth
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Marital Status</span>

            <strong>
              {formatLabel(
                resident.maritalStatus
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Phone Number</span>

            <strong>
              {resident.phoneNumber ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Relationship to Head
            </span>

            <strong>
              {formatLabel(
                resident.relationshipToHead
              )}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          SOCIO-ECONOMIC INFORMATION
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Socio-Economic Information
            </h2>

            <p>
              Education and occupational
              information.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>Occupation</span>

            <strong>
              {resident.occupation ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Education Level
            </span>

            <strong>
              {resident.educationLevel ||
                "N/A"}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          HOUSEHOLD
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Household Information
            </h2>

            <p>
              Household where this resident
              is registered.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>Household ID</span>

            <strong>
              {resident.household
                ?.householdId ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Compound</span>

            <strong>
              {resident.household
                ?.compound ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              House Number
            </span>

            <strong>
              {resident.household
                ?.houseNumber ||
                "N/A"}
            </strong>
          </div>

        </div>

        {householdId && (

          <div className="resident-profile-actions">

            <button
              onClick={() =>
                navigate(
                  `/households/${householdId}`
                )
              }
            >
              🏠 View Household
            </button>

            <button
              onClick={() =>
                navigate(
                  `/households/${householdId}/tree`
                )
              }
            >
              🌳 Relationship Tree
            </button>

          </div>

        )}

      </section>

      {/* =====================================================
          GPS
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              GPS Information
            </h2>

            <p>
              Geographic location captured
              during registration.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>Latitude</span>

            <strong>
              {resident.gps
                ?.latitude ??
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Longitude</span>

            <strong>
              {resident.gps
                ?.longitude ??
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Accuracy</span>

            <strong>
              {resident.gps
                ?.accuracy != null
                ? `${resident.gps.accuracy} m`
                : "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Captured At</span>

            <strong>
              {formatDateTime(
                resident.gps
                  ?.capturedAt
              )}
            </strong>
          </div>

        </div>

        {resident.gps?.latitude != null &&
          resident.gps?.longitude != null && (

            <div className="resident-profile-actions">

              <button
                onClick={() =>
                  navigate("/map")
                }
              >
                📍 Open Community Map
              </button>

            </div>

          )}

      </section>

      {/* =====================================================
          VERIFICATION
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Verification
            </h2>

            <p>
              Resident identity verification
              information.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>
              Verification Status
            </span>

            <strong>
              {formatLabel(
                resident.verificationStatus
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Verified At</span>

            <strong>
              {formatDateTime(
                resident.verifiedAt
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Verified By</span>

            <strong>
              {resident.verifiedBy
                ?.fullname ||
                resident.verifiedBy
                  ?.username ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Identity Status
            </span>

            <strong>
              {formatLabel(
                resident.identityStatus
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Identity Issued
            </span>

            <strong>
              {formatDateTime(
                resident.identityIssuedAt
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Identity Last Updated
            </span>

            <strong>
              {formatDateTime(
                resident.identityUpdatedAt
              )}
            </strong>
          </div>

        </div>

        {resident.rejectionReason && (

          <div className="resident-profile-error">

            <strong>
              Rejection Reason:
            </strong>{" "}

            {resident.rejectionReason}

          </div>

        )}

      </section>

      {/* =====================================================
          BIOMETRIC
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Biometric Information
            </h2>

            <p>
              Fingerprint biometric
              enrollment status.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>Enrolled</span>

            <strong>
              {resident.biometric
                ?.enrolled
                ? "Yes"
                : "No"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>Provider</span>

            <strong>
              {resident.biometric
                ?.provider ||
                "Not enrolled"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Enrolled At
            </span>

            <strong>
              {formatDateTime(
                resident.biometric
                  ?.enrolledAt
              )}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          DIGITAL IDENTITY
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Digital Identity
            </h2>

            <p>
              TA-HOSS LOG identity and
              identification services.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>
              Identity Status
            </span>

            <strong>
              {formatLabel(
                resident.identityStatus
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              QR Identity
            </span>

            <strong>
              {resident.qrToken
                ? "Available"
                : "Not issued"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Identity Issued
            </span>

            <strong>
              {formatDateTime(
                resident.identityIssuedAt
              )}
            </strong>
          </div>

        </div>

        <div className="resident-profile-actions">

          <button
            onClick={() =>
              navigate(
                `/resident/${resident._id}/identity`
              )
            }
          >
            🪪 Identity Profile
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${resident._id}/id-card`
              )
            }
          >
            🪪 View ID Card
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${resident._id}/qr`
              )
            }
          >
            ▣ QR Identity
          </button>

        </div>

      </section>

      {/* =====================================================
          REGISTRATION
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-panel-header">

          <div>
            <h2>
              Registration Information
            </h2>

            <p>
              Resident registration
              and system records.
            </p>
          </div>

        </div>

        <div className="resident-details-grid">

          <div className="resident-detail-item">
            <span>Resident ID</span>

            <strong>
              {resident.residentId ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Registered At
            </span>

            <strong>
              {formatDateTime(
                resident.createdAt
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Last Updated
            </span>

            <strong>
              {formatDateTime(
                resident.updatedAt
              )}
            </strong>
          </div>

          <div className="resident-detail-item">
            <span>
              Registered By
            </span>

            <strong>
              {resident.registeredBy
                ?.fullname ||
                resident.registeredBy
                  ?.username ||
                "N/A"}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          BOTTOM ACTIONS
      ====================================================== */}

      <section className="resident-profile-panel">

        <div className="resident-profile-action-grid">

          <button
            onClick={() =>
              navigate(-1)
            }
          >
            <strong>
              ← Back
            </strong>

            <span>
              Return to previous page
            </span>
          </button>

          {householdId && (

            <button
              onClick={() =>
                navigate(
                  `/households/${householdId}`
                )
              }
            >
              <strong>
                🏠 Household
              </strong>

              <span>
                View household
              </span>
            </button>

          )}

          {householdId && (

            <button
              onClick={() =>
                navigate(
                  `/households/${householdId}/tree`
                )
              }
            >
              <strong>
                🌳 Family Tree
              </strong>

              <span>
                View relationships
              </span>
            </button>

          )}

          <button
            onClick={() =>
              navigate("/residents")
            }
          >
            <strong>
              👥 Residents
            </strong>

            <span>
              Resident registry
            </span>
          </button>

        </div>

      </section>

    </div>
  );
};

export default ResidentProfilePage;