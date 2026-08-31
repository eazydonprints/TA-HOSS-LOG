import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./ResidentIdentityPage.css";

const ResidentIdentityPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError] = useState("");

  const loadIdentity = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/identity/${id}/profile`);

      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError("Resident identity information was not found.");
      }
    } catch (err) {
      console.error("RESIDENT IDENTITY ERROR:", err);
      setError(
        err.response?.data?.message || "Unable to load resident identity."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadIdentity();
    }
  }, [id]);

  const generateQR = async () => {
    try {
      setGeneratingQR(true);
      setError("");

      const response = await api.post(`/identity/${id}/qr`);

      if (response.data?.success) {
        await loadIdentity();
        navigate(`/resident/${id}/qr`);
      } else {
        setError(response.data?.message || "Unable to generate QR identity.");
      }
    } catch (err) {
      console.error("GENERATE QR ERROR:", err);
      setError(
        err.response?.data?.message || "Unable to generate QR identity."
      );
    } finally {
      setGeneratingQR(false);
    }
  };

  const fullName = data?.resident?.fullName || "Unknown Resident";

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading resident identity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">{error}</div>
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go Back"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <strong>Identity not found</strong>
          <span>The requested digital identity could not be found.</span>
        </div>
      </div>
    );
  }

  const identity = data.identity || {};
  const resident = data.resident || {};
  const household = data.household || null;
  const verification = data.verification || {};
  const qr = data.qr || {};

  return (
    <div className="dashboard-page resident-identity-page">
      {/* PAGE HEADER */}
      <div className="dashboard-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Identity & QR / {resident.residentId || "N/A"}
          </div>
          <h1>Resident Digital Identity</h1>
          <p>Official TA-HOSS LOG digital identity profile.</p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          ← Back
        </button>
      </div>

      {/* HERO / IDENTITY PROFILE CARD */}
      <section className="identity-profile-card">
        <div className="identity-profile-photo">
          {resident.photo ? (
            <img src={resident.photo} alt={fullName} />
          ) : (
            <span>{resident.firstName?.charAt(0)?.toUpperCase() || "?"}</span>
          )}
        </div>

        <div className="identity-profile-content">
          <span className="identity-label">TA-HOSS DIGITAL IDENTITY</span>
          <h2>{fullName}</h2>
          <div className="identity-number">{resident.residentId || "N/A"}</div>

          <div className="resident-status-row">
            <span
              className={`status-badge ${
                identity.verificationStatus === "verified"
                  ? "verified"
                  : identity.verificationStatus === "rejected"
                  ? "rejected"
                  : "pending"
              }`}
            >
              Verification: {identity.verificationStatus || "pending"}
            </span>

            <span
              className={`status-badge ${
                identity.identityStatus === "active" ? "verified" : "pending"
              }`}
            >
              Identity: {identity.identityStatus || "pending"}
            </span>
          </div>
        </div>
      </section>

      {/* IDENTITY INFORMATION */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>Identity Information</h2>
            <p>Current status of the resident's official digital identity.</p>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span>Resident ID</span>
            <strong>{resident.residentId || "N/A"}</strong>
          </div>

          <div className="detail-item">
            <span>Identity Status</span>
            <strong>{identity.identityStatus || "pending"}</strong>
          </div>

          <div className="detail-item">
            <span>Verification Status</span>
            <strong>{identity.verificationStatus || "pending"}</strong>
          </div>

          <div className="detail-item">
            <span>Identity Issued</span>
            <strong>{formatDate(identity.identityIssuedAt)}</strong>
          </div>

          <div className="detail-item">
            <span>Last Identity Update</span>
            <strong>{formatDate(identity.identityUpdatedAt)}</strong>
          </div>
        </div>
      </section>

      {/* PERSONAL INFORMATION */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>Personal Information</h2>
            <p>Personal information attached to this identity.</p>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span>Full Name</span>
            <strong>{fullName}</strong>
          </div>

          <div className="detail-item">
            <span>Gender</span>
            <strong>{resident.gender || "N/A"}</strong>
          </div>

          <div className="detail-item">
            <span>Date of Birth</span>
            <strong>{formatDate(resident.dateOfBirth)}</strong>
          </div>

          <div className="detail-item">
            <span>Relationship to Head</span>
            <strong>{resident.relationshipToHead || "N/A"}</strong>
          </div>
        </div>
      </section>

      {/* HOUSEHOLD PANEL */}
      {household && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Household</h2>
              <p>Household associated with this resident identity.</p>
            </div>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <span>Household ID</span>
              <strong>{household.householdId || "N/A"}</strong>
            </div>

            <div className="detail-item">
              <span>Community</span>
              <strong>{household.community || "Ta-hoss Community"}</strong>
            </div>

            <div className="detail-item">
              <span>Compound</span>
              <strong>{household.compound || "N/A"}</strong>
            </div>

            <div className="detail-item">
              <span>House Number</span>
              <strong>{household.houseNumber || "N/A"}</strong>
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="btn-primary"
              onClick={() => navigate(`/households/${household.id}`)}
            >
              🏠 View Household
            </button>
          </div>
        </section>
      )}

      {/* VERIFICATION RECORD */}
      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>Verification Record</h2>
            <p>Official verification information.</p>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span>Status</span>
            <strong>{verification.status || "pending"}</strong>
          </div>

          <div className="detail-item">
            <span>Verified At</span>
            <strong>{formatDate(verification.verifiedAt)}</strong>
          </div>

          <div className="detail-item">
            <span>Verified By</span>
            <strong>{verification.verifiedBy?.fullname || "N/A"}</strong>
          </div>
        </div>

        {verification.rejectionReason && (
          <div className="dashboard-error">
            <strong>Rejection Reason:</strong> {verification.rejectionReason}
          </div>
        )}
      </section>

      {/* QR IDENTITY PANEL */}
      <section className="dashboard-panel identity-qr-panel">
        <div className="panel-header">
          <div>
            <h2>QR Identity</h2>
            <p>Secure QR identity used to verify this resident.</p>
          </div>
        </div>

        {qr.available ? (
          <div className="qr-identity-summary">
            <div className="qr-success-icon">✓</div>

            <div>
              <strong>QR Identity Available</strong>
              <p>This resident already has an active TA-HOSS QR identity.</p>
            </div>

            <button
              className="btn-primary"
              onClick={() => navigate(`/resident/${id}/qr`)}
            >
              View QR Identity
            </button>
          </div>
        ) : (
          <div className="qr-empty-state">
            <div className="qr-empty-icon">▣</div>

            <div>
              <strong>QR Identity Not Generated</strong>
              <p>Generate a QR identity for this verified resident.</p>
            </div>

            <button
              className="btn-primary"
              disabled={generatingQR}
              onClick={generateQR}
            >
              {generatingQR ? "Generating..." : "Generate QR Identity"}
            </button>
          </div>
        )}
      </section>

      {/* BOTTOM ACTION GRID */}
      <section className="dashboard-panel">
        <div className="household-action-grid">
          <button onClick={() => navigate(`/resident/${id}`)}>
            <strong>← Resident Profile</strong>
            <span>View complete resident record</span>
          </button>

          {qr.available && (
            <button onClick={() => navigate(`/resident/${id}/qr`)}>
              <strong>▣ QR Identity</strong>
              <span>View and verify QR identity</span>
            </button>
          )}

          <button onClick={() => navigate(`/resident/${id}/id-card`)}>
            <strong>🪪 ID Card</strong>
            <span>View resident identification card</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResidentIdentityPage;