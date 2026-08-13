import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";
import "./ResidentQRPage.css";

const ResidentQRPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [qrData, setQrData] =
    useState(null);

  const [resident, setResident] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadQR = async () => {
    try {
      setLoading(true);
      setError("");

      const profileResponse =
        await api.get(
          `/identity/${id}/profile`
        );

      if (
        !profileResponse.data?.success
      ) {
        setError(
          "Unable to load resident identity."
        );

        return;
      }

      const profile =
        profileResponse.data.data;

      setResident(profile);

      if (!profile.qr?.available) {
        setQrData(null);
        return;
      }

      /*
       * The existing profile endpoint tells us
       * that the QR exists, but does not return
       * the QR image itself.
       *
       * We therefore use the QR generation
       * endpoint. The backend reuses the existing
       * token rather than creating another one.
       */
      const qrResponse =
        await api.post(
          `/identity/${id}/qr`
        );

      if (qrResponse.data?.success) {
        setQrData(
          qrResponse.data.data
        );
      } else {
        setError(
          qrResponse.data?.message ||
            "Unable to load QR identity."
        );
      }
    } catch (err) {
      console.error(
        "RESIDENT QR PAGE ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load resident QR identity."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadQR();
    }
  }, [id]);

  const generateQR = async () => {
    try {
      setGenerating(true);
      setError("");

      const response =
        await api.post(
          `/identity/${id}/qr`
        );

      if (response.data?.success) {
        setQrData(
          response.data.data
        );

        const profileResponse =
          await api.get(
            `/identity/${id}/profile`
          );

        if (
          profileResponse.data?.success
        ) {
          setResident(
            profileResponse.data.data
          );
        }
      } else {
        setError(
          response.data?.message ||
            "Unable to generate QR identity."
        );
      }
    } catch (err) {
      console.error(
        "GENERATE QR ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to generate QR identity."
      );
    } finally {
      setGenerating(false);
    }
  };

  const fullName =
    resident?.resident?.fullName ||
    "Unknown Resident";

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading QR identity...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          {error}
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page resident-qr-page">
      <div className="dashboard-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Identity & QR /
            QR Identity
          </div>

          <h1>
            Resident QR Identity
          </h1>

          <p>
            Secure QR code for TA-HOSS LOG
            identity verification.
          </p>
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>
      </div>

      <section className="dashboard-panel qr-main-card">
        <div className="qr-resident-header">
          <div className="identity-profile-photo small">
            {resident?.resident?.photo ? (
              <img
                src={
                  resident.resident.photo
                }
                alt={fullName}
              />
            ) : (
              <span>
                {resident?.resident?.firstName
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "?"}
              </span>
            )}
          </div>

          <div>
            <span className="identity-label">
              TA-HOSS DIGITAL IDENTITY
            </span>

            <h2>
              {fullName}
            </h2>

            <strong className="identity-number">
              {
                resident?.resident
                  ?.residentId
              }
            </strong>
          </div>
        </div>

        {!qrData ? (
          <div className="qr-generate-box">
            <div className="qr-large-icon">
              ▣
            </div>

            <h2>
              QR Identity Not Available
            </h2>

            <p>
              This resident does not currently
              have a generated QR identity.
            </p>

            <button
              className="primary-action-button"
              disabled={generating}
              onClick={generateQR}
            >
              {generating
                ? "Generating QR..."
                : "Generate QR Identity"}
            </button>
          </div>
        ) : (
          <div className="qr-display-layout">
            <div className="qr-code-container">
              <img
                src={qrData.qrCode}
                alt={`TA-HOSS QR identity for ${fullName}`}
              />
            </div>

            <div className="qr-information">
              <span className="qr-active-badge">
                ✓ ACTIVE QR IDENTITY
              </span>

              <h2>
                QR Identity Ready
              </h2>

              <p>
                Scan this QR code using a
                compatible TA-HOSS verification
                application to verify this
                resident's identity.
              </p>

              <div className="qr-detail-list">
                <div>
                  <span>
                    Resident ID
                  </span>

                  <strong>
                    {
                      qrData.residentId
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Identity Status
                  </span>

                  <strong>
                    {
                      qrData.identityStatus
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Verification
                  </span>

                  <strong>
                    Verified
                  </strong>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  onClick={() =>
                    navigate(
                      `/resident/${id}/identity`
                    )
                  }
                >
                  Identity Profile
                </button>

                <button
                  onClick={() =>
                    navigate(
                      `/resident/${id}/id-card`
                    )
                  }
                >
                  🪪 ID Card
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {qrData?.verificationUrl && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>
                Verification Reference
              </h2>

              <p>
                Internal TA-HOSS QR verification
                reference.
              </p>
            </div>
          </div>

          <div className="qr-url-box">
            <span>
              Verification URL
            </span>

            <code>
              {qrData.verificationUrl}
            </code>
          </div>
        </section>
      )}

      <section className="dashboard-panel">
        <div className="household-action-grid">
          <button
            onClick={() =>
              navigate(
                `/resident/${id}`
              )
            }
          >
            <strong>
              ← Resident Profile
            </strong>

            <span>
              Return to resident profile
            </span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${id}/identity`
              )
            }
          >
            <strong>
              ◉ Digital Identity
            </strong>

            <span>
              View identity information
            </span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${id}/id-card`
              )
            }
          >
            <strong>
              🪪 ID Card
            </strong>

            <span>
              View official ID card
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResidentQRPage;