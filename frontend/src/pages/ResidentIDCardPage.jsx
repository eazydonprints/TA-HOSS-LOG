import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

import "./ResidentIDCardPage.css";

const ResidentIDCardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCard = async () => {
      if (!id) {
        setError("Resident ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/identity/${id}/id-card`
        );

        console.log(
          "RESIDENT ID CARD:",
          response.data
        );

        if (
          response.data?.success &&
          response.data?.data
        ) {
          setCardData(response.data.data);
        } else {
          setError(
            response.data?.message ||
              "Unable to load resident ID card."
          );
        }
      } catch (err) {
        console.error(
          "RESIDENT ID CARD ERROR:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load resident ID card."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [id]);

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const handleGeneratePDF = async () => {
    if (!id) {
      return;
    }

    try {
      setGeneratingPDF(true);
      setError("");

      const response = await api.get(
        `/identity/${id}/id-card/pdf`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download = `TA-HOSS-${cardData?.resident?.residentId || id}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "GENERATE ID CARD PDF ERROR:",
        err
      );

      /*
       * Axios may return the backend error
       * as a Blob when responseType = blob.
       */
      let message =
        "Unable to generate ID card PDF.";

      try {
        if (
          err.response?.data instanceof Blob
        ) {
          const text =
            await err.response.data.text();

          const parsed =
            JSON.parse(text);

          message =
            parsed.message || message;
        } else {
          message =
            err.response?.data?.message ||
            message;
        }
      } catch {
        // Keep fallback message.
      }

      setError(message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="dashboard-page resident-id-card-page">
        <div className="resident-id-card-loading">
          <div className="loading-spinner" />

          <p>
            Preparing resident ID card...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page resident-id-card-page">
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb">
              TA-HOSS LOG / Identity / ID Card
            </div>

            <h1>
              Resident ID Card
            </h1>

            <p>
              Official TA-HOSS LOG resident
              identification card.
            </p>
          </div>

          <button
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
        </div>

        <section className="dashboard-panel">
          <div className="resident-id-card-error">
            <div className="resident-id-card-error-icon">
              !
            </div>

            <h2>
              Unable to load ID card
            </h2>

            <p>
              {error}
            </p>

            <button
              className="resident-id-card-secondary-button"
              onClick={() => navigate(-1)}
            >
              ← Return
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="dashboard-page resident-id-card-page">
        <div className="empty-state">
          <strong>
            ID card information not found
          </strong>

          <span>
            The requested resident ID card
            could not be loaded.
          </span>
        </div>
      </div>
    );
  }

  const {
    card,
    resident,
    household,
    identity,
    qr,
  } = cardData;

  return (
    <div className="dashboard-page resident-id-card-page">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="dashboard-header resident-id-card-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Identity / ID Cards /
            {resident?.residentId}
          </div>

          <h1>
            Resident ID Card
          </h1>

          <p>
            Official digital identification
            card for the registered resident.
          </p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      {/* =====================================================
          ACTION BAR
      ====================================================== */}

      {error && (
        <div className="resident-id-card-inline-error">
          {error}
        </div>
      )}

      <section className="dashboard-panel resident-id-card-actions-panel">
        <div className="resident-id-card-actions">
          <button
            className="resident-id-card-primary-button"
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>
                <span className="button-spinner" />
                Generating PDF...
              </>
            ) : (
              <>
                ↓ Generate PDF
              </>
            )}
          </button>

          <button
            className="resident-id-card-secondary-button"
            onClick={handlePrint}
          >
            🖨 Print Card
          </button>

          <button
            className="resident-id-card-secondary-button"
            onClick={() =>
              navigate(
                `/resident/${id}/identity`
              )
            }
          >
            🪪 Identity Profile
          </button>

          <button
            className="resident-id-card-secondary-button"
            onClick={() =>
              navigate(
                `/resident/${id}/qr`
              )
            }
          >
            ▣ QR Identity
          </button>
        </div>
      </section>

      {/* =====================================================
          ID CARD
      ====================================================== */}

      <section className="dashboard-panel resident-id-card-preview-panel">
        <div className="panel-header">
          <div>
            <h2>
              ID Card Preview
            </h2>

            <p>
              Preview of the official TA-HOSS
              LOG resident identification card.
            </p>
          </div>

          <span className="resident-id-card-status">
            {identity?.identityStatus ===
            "active"
              ? "ACTIVE"
              : identity?.identityStatus ||
                "PENDING"}
          </span>
        </div>

        <div className="resident-id-card-stage">
          <div className="resident-id-card">
            {/* =================================================
                CARD HEADER
            ================================================== */}

            <div className="resident-id-card-top">
              <div className="resident-id-card-brand">
                <div className="resident-id-card-brand-mark">
                  TH
                </div>

                <div>
                  <strong>
                    {card?.organization ||
                      "TA-HOSS LOG"}
                  </strong>

                  <span>
                    {card?.title ||
                      "COMMUNITY REGISTER"}
                  </span>
                </div>
              </div>

              <div className="resident-id-card-community">
                {card?.community ||
                  "Ta-hoss Community"}

                <small>
                  Resident Identification
                </small>
              </div>
            </div>

            {/* =================================================
                CARD BODY
            ================================================== */}

            <div className="resident-id-card-body">
              {/* PHOTO */}

              <div className="resident-id-card-photo">
                {resident?.photo ? (
                  <img
                    src={resident.photo}
                    alt={
                      resident.fullName ||
                      "Resident"
                    }
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";

                      const fallback =
                        event.currentTarget
                          .parentElement
                          ?.querySelector(
                            ".resident-id-card-photo-fallback"
                          );

                      if (fallback) {
                        fallback.style.display =
                          "flex";
                      }
                    }}
                  />
                ) : null}

                <div
                  className="resident-id-card-photo-fallback"
                  style={{
                    display: resident?.photo
                      ? "none"
                      : "flex",
                  }}
                >
                  {resident?.fullName
                    ?.charAt(0)
                    ?.toUpperCase() || "?"}
                </div>
              </div>

              {/* DETAILS */}

              <div className="resident-id-card-details">
                <div className="resident-id-card-name">
                  {resident?.fullName ||
                    "N/A"}
                </div>

                <div className="resident-id-card-detail">
                  <span>
                    Resident ID
                  </span>

                  <strong>
                    {resident?.residentId ||
                      "N/A"}
                  </strong>
                </div>

                <div className="resident-id-card-detail-row">
                  <div className="resident-id-card-detail">
                    <span>
                      Gender
                    </span>

                    <strong>
                      {resident?.gender
                        ? resident.gender
                            .charAt(0)
                            .toUpperCase() +
                          resident.gender.slice(
                            1
                          )
                        : "N/A"}
                    </strong>
                  </div>

                  <div className="resident-id-card-detail">
                    <span>
                      Date of Birth
                    </span>

                    <strong>
                      {formatDate(
                        resident?.dateOfBirth
                      )}
                    </strong>
                  </div>
                </div>

                <div className="resident-id-card-detail">
                  <span>
                    Household
                  </span>

                  <strong>
                    {household?.householdId ||
                      "N/A"}
                  </strong>
                </div>

                <div className="resident-id-card-detail">
                  <span>
                    House
                  </span>

                  <strong>
                    {household?.houseNumber ||
                      "N/A"}
                  </strong>
                </div>
              </div>

              {/* QR */}

              <div className="resident-id-card-qr">
                {qr?.qrCode ? (
                  <img
                    src={qr.qrCode}
                    alt="TA-HOSS QR verification code"
                  />
                ) : (
                  <div className="resident-id-card-qr-empty">
                    QR
                  </div>
                )}

                <span>
                  Scan to verify
                </span>
              </div>
            </div>

            {/* =================================================
                CARD STATUS
            ================================================== */}

            <div className="resident-id-card-status-bar">
              <div>
                <span>
                  IDENTITY STATUS
                </span>

                <strong>
                  {identity?.identityStatus
                    ?.toUpperCase() ||
                    "PENDING"}
                </strong>
              </div>

              <div>
                <span>
                  VERIFICATION
                </span>

                <strong>
                  {identity?.verificationStatus
                    ?.toUpperCase() ||
                    "PENDING"}
                </strong>
              </div>

              <div className="resident-id-card-valid">
                ✓ VALID COMMUNITY ID
              </div>
            </div>

            {/* =================================================
                CARD FOOTER
            ================================================== */}

            <div className="resident-id-card-footer">
              <span>
                {card?.location ||
                  "Riyom Local Government Area, Plateau State, Nigeria"}
              </span>

              <span>
                TA-HOSS LOG • Official Community
                Register
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CARD INFORMATION
      ====================================================== */}

      <section className="dashboard-panel resident-id-card-information-panel">
        <div className="panel-header">
          <div>
            <h2>
              Card Information
            </h2>

            <p>
              Information associated with this
              resident identification card.
            </p>
          </div>
        </div>

        <div className="resident-id-card-info-grid">
          <div className="resident-id-card-info-item">
            <span>
              Resident ID
            </span>

            <strong>
              {resident?.residentId ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              Identity Status
            </span>

            <strong>
              {identity?.identityStatus ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              Verification Status
            </span>

            <strong>
              {identity?.verificationStatus ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              Identity Issued
            </span>

            <strong>
              {formatDate(
                identity?.identityIssuedAt
              )}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              Household ID
            </span>

            <strong>
              {household?.householdId ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              Compound
            </span>

            <strong>
              {household?.compound ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              House Number
            </span>

            <strong>
              {household?.houseNumber ||
                "N/A"}
            </strong>
          </div>

          <div className="resident-id-card-info-item">
            <span>
              QR Identity
            </span>

            <strong>
              {qr?.verificationUrl
                ? "Available"
                : "Not available"}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          BOTTOM ACTIONS
      ====================================================== */}

      <section className="dashboard-panel resident-id-card-bottom-panel">
        <div className="resident-id-card-bottom-actions">
          <button
            onClick={() => navigate(-1)}
          >
            <strong>
              ← Back
            </strong>

            <span>
              Return to previous page
            </span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${id}`
              )
            }
          >
            <strong>
              ♙ Resident Profile
            </strong>

            <span>
              View complete resident
              information
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
              🪪 Digital Identity
            </strong>

            <span>
              View resident identity
            </span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/resident/${id}/qr`
              )
            }
          >
            <strong>
              ▣ QR Identity
            </strong>

            <span>
              View QR verification
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResidentIDCardPage;