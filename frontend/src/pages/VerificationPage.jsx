import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

import "./VerificationPage.css";

const VerificationPage = () => {
  const navigate = useNavigate();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showDetails, setShowDetails] = useState(false);

  /*
   * =========================================================
   * LOAD PENDING RESIDENTS
   * =========================================================
   */

  const loadPendingResidents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/verification/pending");

      if (response.data?.success) {
        setResidents(response.data.data || []);
      } else {
        setResidents([]);

        setError(
          response.data?.message ||
            "Unable to load pending residents."
        );
      }
    } catch (err) {
      console.error(
        "VERIFICATION LOAD ERROR:",
        err
      );

      setResidents([]);

      setError(
        err.response?.data?.message ||
          "Unable to load pending residents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingResidents();
  }, [loadPendingResidents]);

  /*
   * =========================================================
   * CLEAR NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [success]);

  /*
   * =========================================================
   * FORMAT DATE
   * =========================================================
   */

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

  /*
   * =========================================================
   * FORMAT FULL NAME
   * =========================================================
   */

  const getFullName = (resident) => {
    if (!resident) {
      return "Unknown Resident";
    }

    return [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  /*
   * =========================================================
   * FILTER RESIDENTS
   * =========================================================
   */

  const filteredResidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return residents;
    }

    return residents.filter((resident) => {
      const fullName =
        getFullName(resident).toLowerCase();

      const residentId =
        resident.residentId?.toLowerCase() || "";

      const phone =
        resident.phoneNumber?.toLowerCase() || "";

      const householdId =
        resident.household?.householdId
          ?.toLowerCase() || "";

      const compound =
        resident.household?.compound
          ?.toLowerCase() || "";

      return (
        fullName.includes(query) ||
        residentId.includes(query) ||
        phone.includes(query) ||
        householdId.includes(query) ||
        compound.includes(query)
      );
    });
  }, [residents, search]);

  /*
   * =========================================================
   * VERIFY RESIDENT
   * =========================================================
   */

  const handleVerify = async (resident) => {
    if (!resident?._id) {
      return;
    }

    const fullName = getFullName(resident);

    const confirmed = window.confirm(
      `Verify ${fullName}?\n\n` +
        "This will mark the resident as verified and activate their digital identity."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `verify-${resident._id}`
      );

      setError("");
      setSuccess("");

      const response = await api.patch(
        `/verification/${resident._id}/verify`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Resident verification failed."
        );
      }

      setSuccess(
        `${fullName} has been successfully verified. Digital identity is now active.`
      );

      setResidents((current) =>
        current.filter(
          (item) =>
            item._id !== resident._id
        )
      );

      if (
        selectedResident?._id ===
        resident._id
      ) {
        setSelectedResident(null);
        setShowDetails(false);
      }
    } catch (err) {
      console.error(
        "VERIFY RESIDENT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to verify resident."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * =========================================================
   * OPEN REJECTION MODAL
   * =========================================================
   */

  const openRejectModal = (resident) => {
    setSelectedResident(resident);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  /*
   * =========================================================
   * CLOSE REJECTION MODAL
   * =========================================================
   */

  const closeRejectModal = () => {
    if (actionLoading) {
      return;
    }

    setShowRejectModal(false);
    setRejectionReason("");
    setSelectedResident(null);
  };

  /*
   * =========================================================
   * REJECT RESIDENT
   * =========================================================
   */

  const handleReject = async (event) => {
    event.preventDefault();

    if (!selectedResident?._id) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setError(
        "Please provide a reason for rejecting this resident."
      );

      return;
    }

    try {
      setActionLoading(
        `reject-${selectedResident._id}`
      );

      setError("");
      setSuccess("");

      const response = await api.patch(
        `/verification/${selectedResident._id}/reject`,
        {
          reason,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Resident rejection failed."
        );
      }

      const fullName =
        getFullName(selectedResident);

      setSuccess(
        `${fullName} has been rejected successfully.`
      );

      setResidents((current) =>
        current.filter(
          (item) =>
            item._id !==
            selectedResident._id
        )
      );

      closeRejectModal();
    } catch (err) {
      console.error(
        "REJECT RESIDENT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to reject resident."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * =========================================================
   * OPEN DETAILS
   * =========================================================
   */

  const openDetails = (resident) => {
    setSelectedResident(resident);
    setShowDetails(true);
  };

  /*
   * =========================================================
   * CLOSE DETAILS
   * =========================================================
   */

  const closeDetails = () => {
    setSelectedResident(null);
    setShowDetails(false);
  };

  /*
   * =========================================================
   * VIEW PROFILE
   * =========================================================
   */

  const viewResidentProfile = (resident) => {
    if (!resident?._id) {
      return;
    }

    navigate(
      `/resident/${resident._id}`
    );
  };

  /*
   * =========================================================
   * REFRESH
   * =========================================================
   */

  const handleRefresh = () => {
    setSuccess("");
    setError("");
    loadPendingResidents();
  };

  /*
   * =========================================================
   * LOADING STATE
   * =========================================================
   */

  if (loading) {
    return (
      <div className="dashboard-page verification-page">
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb">
              TA-HOSS LOG / Verification
            </div>

            <h1>Verification</h1>

            <p>
              Review and verify registered
              residents before activating
              their digital identity.
            </p>
          </div>
        </div>

        <section className="dashboard-panel verification-loading-panel">
          <div className="verification-loading">
            <div className="loading-spinner" />

            <strong>
              Loading pending residents...
            </strong>

            <span>
              Please wait while TA-HOSS LOG
              retrieves verification records.
            </span>
          </div>
        </section>
      </div>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="dashboard-page verification-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header verification-header">

        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Verification
          </div>

          <h1>
            Resident Verification
          </h1>

          <p>
            Review registered residents,
            verify their information, and
            activate their TA-HOSS digital
            identity.
          </p>
        </div>

        <div className="verification-header-actions">

          <button
            type="button"
            className="verification-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            ↻ Refresh
          </button>

        </div>

      </div>

      {/* =====================================================
          NOTIFICATIONS
      ====================================================== */}

      {error && (
        <div className="verification-alert verification-alert-error">
          <div className="verification-alert-icon">
            !
          </div>

          <div>
            <strong>
              Verification Error
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="verification-alert verification-alert-success">
          <div className="verification-alert-icon">
            ✓
          </div>

          <div>
            <strong>
              Verification Successful
            </strong>

            <span>
              {success}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close success message"
          >
            ×
          </button>
        </div>
      )}

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <section className="verification-stats">

        <div className="verification-stat-card">

          <div className="verification-stat-icon pending">
            ⏳
          </div>

          <div>
            <span>
              Pending Verification
            </span>

            <strong>
              {residents.length}
            </strong>
          </div>

        </div>

        <div className="verification-stat-card">

          <div className="verification-stat-icon review">
            ◉
          </div>

          <div>
            <span>
              Showing
            </span>

            <strong>
              {filteredResidents.length}
            </strong>
          </div>

        </div>

        <div className="verification-stat-card">

          <div className="verification-stat-icon secure">
            ✓
          </div>

          <div>
            <span>
              Required Action
            </span>

            <strong>
              Review
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          REGISTRY PANEL
      ====================================================== */}

      <section className="dashboard-panel verification-panel">

        <div className="panel-header verification-panel-header">

          <div>
            <h2>
              Pending Residents
            </h2>

            <p>
              Residents awaiting verification
              by an authorized verification
              officer.
            </p>
          </div>

          <div className="verification-count">
            {filteredResidents.length}{" "}
            {filteredResidents.length === 1
              ? "resident"
              : "residents"}
          </div>

        </div>

        {/* ===================================================
            SEARCH
        ==================================================== */}

        <div className="verification-toolbar">

          <div className="verification-search">

            <span className="verification-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by name, Resident ID, phone, household..."
            />

            {search && (
              <button
                type="button"
                className="verification-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>

          <div className="verification-toolbar-info">
            {search
              ? `Search results for "${search}"`
              : "All pending verification records"}
          </div>

        </div>

        {/* ===================================================
            EMPTY STATE
        ==================================================== */}

        {filteredResidents.length === 0 && (
          <div className="verification-empty">

            <div className="verification-empty-icon">
              {search ? "⌕" : "✓"}
            </div>

            <h3>
              {search
                ? "No matching residents"
                : "Verification queue is clear"}
            </h3>

            <p>
              {search
                ? "No pending resident matches your search criteria."
                : "There are currently no residents waiting for verification."}
            </p>

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="verification-secondary-button"
              >
                Clear Search
              </button>
            )}

          </div>
        )}

        {/* ===================================================
            DESKTOP TABLE
        ==================================================== */}

        {filteredResidents.length > 0 && (
          <div className="verification-table-wrapper">

            <table className="verification-table">

              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Resident ID</th>
                  <th>Household</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th className="verification-action-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredResidents.map(
                  (resident) => {
                    const fullName =
                      getFullName(resident);

                    const isVerifying =
                      actionLoading ===
                      `verify-${resident._id}`;

                    const isRejecting =
                      actionLoading ===
                      `reject-${resident._id}`;

                    return (
                      <tr
                        key={resident._id}
                      >

                        {/* RESIDENT */}

                        <td>
                          <div className="verification-resident">

                            <div className="verification-avatar">

                              {resident.photo ? (
                                <img
                                  src={
                                    resident.photo
                                  }
                                  alt={
                                    fullName
                                  }
                                />
                              ) : (
                                <span>
                                  {resident.firstName
                                    ?.charAt(
                                      0
                                    )
                                    ?.toUpperCase() ||
                                    "?"}
                                </span>
                              )}

                            </div>

                            <div className="verification-resident-name">

                              <strong>
                                {fullName}
                              </strong>

                              <span>
                                {resident.gender ||
                                  "Gender N/A"}
                                {" • "}
                                {formatDate(
                                  resident.dateOfBirth
                                )}
                              </span>

                            </div>

                          </div>
                        </td>

                        {/* RESIDENT ID */}

                        <td>
                          <span className="resident-id-text">
                            {resident.residentId ||
                              "N/A"}
                          </span>
                        </td>

                        {/* HOUSEHOLD */}

                        <td>
                          <div className="verification-household">

                            <strong>
                              {resident.household
                                ?.householdId ||
                                "N/A"}
                            </strong>

                            <span>
                              {resident.household
                                ?.compound ||
                                "No compound"}
                            </span>

                            {resident.household
                              ?.houseNumber && (
                              <small>
                                House{" "}
                                {
                                  resident
                                    .household
                                    .houseNumber
                                }
                              </small>
                            )}

                          </div>
                        </td>

                        {/* REGISTRATION */}

                        <td>
                          <div className="verification-registration">

                            <strong>
                              {formatDate(
                                resident.createdAt
                              )}
                            </strong>

                            <span>
                              {resident.registeredBy
                                ?.fullname ||
                                "Unknown officer"}
                            </span>

                          </div>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span className="verification-status-badge pending">
                            <span className="status-dot-small" />
                            Pending
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="verification-actions">

                            <button
                              type="button"
                              className="verification-view-button"
                              onClick={() =>
                                openDetails(
                                  resident
                                )
                              }
                              disabled={
                                isVerifying ||
                                isRejecting
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="verification-verify-button"
                              onClick={() =>
                                handleVerify(
                                  resident
                                )
                              }
                              disabled={
                                isVerifying ||
                                isRejecting
                              }
                            >
                              {isVerifying
                                ? "Verifying..."
                                : "✓ Verify"}
                            </button>

                            <button
                              type="button"
                              className="verification-reject-button"
                              onClick={() =>
                                openRejectModal(
                                  resident
                                )
                              }
                              disabled={
                                isVerifying ||
                                isRejecting
                              }
                            >
                              {isRejecting
                                ? "Rejecting..."
                                : "Reject"}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =====================================================
          INFORMATION PANEL
      ====================================================== */}

      <section className="dashboard-panel verification-info-panel">

        <div className="verification-info-icon">
          i
        </div>

        <div>
          <h3>
            Verification workflow
          </h3>

          <p>
            Only authorized verification
            officers can approve or reject
            residents. Once a resident is
            verified, their digital identity
            becomes active and the resident
            becomes eligible for QR identity
            generation and ID card issuance.
          </p>
        </div>

      </section>

      {/* =====================================================
          DETAILS MODAL
      ====================================================== */}

      {showDetails &&
        selectedResident && (
          <div
            className="verification-modal-backdrop"
            onMouseDown={closeDetails}
          >

            <div
              className="verification-modal verification-details-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <div className="verification-modal-header">

                <div>
                  <span className="verification-modal-label">
                    RESIDENT REVIEW
                  </span>

                  <h2>
                    Resident Information
                  </h2>
                </div>

                <button
                  type="button"
                  className="verification-modal-close"
                  onClick={closeDetails}
                >
                  ×
                </button>

              </div>

              <div className="verification-details-profile">

                <div className="verification-details-photo">

                  {selectedResident.photo ? (
                    <img
                      src={
                        selectedResident.photo
                      }
                      alt={getFullName(
                        selectedResident
                      )}
                    />
                  ) : (
                    <span>
                      {selectedResident.firstName
                        ?.charAt(0)
                        ?.toUpperCase() ||
                        "?"}
                    </span>
                  )}

                </div>

                <div>
                  <h3>
                    {getFullName(
                      selectedResident
                    )}
                  </h3>

                  <p>
                    {
                      selectedResident
                        .residentId
                    }
                  </p>

                  <span className="verification-status-badge pending">
                    <span className="status-dot-small" />
                    Pending Verification
                  </span>
                </div>

              </div>

              <div className="verification-details-grid">

                <div className="verification-detail-item">
                  <span>Gender</span>
                  <strong>
                    {selectedResident.gender ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Date of Birth</span>
                  <strong>
                    {formatDate(
                      selectedResident.dateOfBirth
                    )}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Phone Number</span>
                  <strong>
                    {selectedResident.phoneNumber ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Marital Status</span>
                  <strong>
                    {selectedResident.maritalStatus ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Occupation</span>
                  <strong>
                    {selectedResident.occupation ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Education</span>
                  <strong>
                    {selectedResident.educationLevel ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Relationship to Head</span>
                  <strong>
                    {selectedResident.relationshipToHead ||
                      "N/A"}
                  </strong>
                </div>

                <div className="verification-detail-item">
                  <span>Registered At</span>
                  <strong>
                    {formatDate(
                      selectedResident.createdAt
                    )}
                  </strong>
                </div>

              </div>

              <div className="verification-household-details">

                <h3>
                  Household Information
                </h3>

                <div className="verification-details-grid">

                  <div className="verification-detail-item">
                    <span>Household ID</span>
                    <strong>
                      {selectedResident.household
                        ?.householdId ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="verification-detail-item">
                    <span>Compound</span>
                    <strong>
                      {selectedResident.household
                        ?.compound ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="verification-detail-item">
                    <span>House Number</span>
                    <strong>
                      {selectedResident.household
                        ?.houseNumber ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="verification-detail-item">
                    <span>Registered By</span>
                    <strong>
                      {selectedResident
                        .registeredBy
                        ?.fullname ||
                        "N/A"}
                    </strong>
                  </div>

                </div>

              </div>

              <div className="verification-modal-actions">

                <button
                  type="button"
                  className="verification-profile-button"
                  onClick={() =>
                    viewResidentProfile(
                      selectedResident
                    )
                  }
                >
                  View Full Profile
                </button>

                <button
                  type="button"
                  className="verification-reject-button large"
                  onClick={() => {
                    closeDetails();

                    openRejectModal(
                      selectedResident
                    );
                  }}
                >
                  Reject
                </button>

                <button
                  type="button"
                  className="verification-verify-button large"
                  onClick={() => {
                    closeDetails();

                    handleVerify(
                      selectedResident
                    );
                  }}
                >
                  ✓ Verify Resident
                </button>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          REJECTION MODAL
      ====================================================== */}

      {showRejectModal &&
        selectedResident && (
          <div
            className="verification-modal-backdrop"
            onMouseDown={closeRejectModal}
          >

            <form
              className="verification-modal verification-reject-modal"
              onSubmit={handleReject}
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <div className="verification-modal-header">

                <div>
                  <span className="verification-modal-label rejection">
                    REJECT RESIDENT
                  </span>

                  <h2>
                    Reject Verification
                  </h2>
                </div>

                <button
                  type="button"
                  className="verification-modal-close"
                  onClick={closeRejectModal}
                  disabled={
                    !!actionLoading
                  }
                >
                  ×
                </button>

              </div>

              <div className="verification-rejection-warning">

                <div className="verification-warning-icon">
                  !
                </div>

                <div>
                  <strong>
                    You are rejecting:
                  </strong>

                  <span>
                    {getFullName(
                      selectedResident
                    )}
                  </span>

                  <small>
                    Resident ID:{" "}
                    {
                      selectedResident.residentId
                    }
                  </small>
                </div>

              </div>

              <div className="verification-form-group">

                <label htmlFor="rejectionReason">
                  Rejection Reason
                  <span>*</span>
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  placeholder="Enter a clear reason for rejecting this resident..."
                  rows={5}
                  maxLength={500}
                  required
                  disabled={
                    !!actionLoading
                  }
                />

                <div className="verification-character-count">
                  {rejectionReason.length}/500
                </div>

              </div>

              <div className="verification-rejection-note">
                <strong>
                  Note:
                </strong>

                <span>
                  The resident will remain in
                  the registry but their
                  verification status will be
                  marked as rejected. Their
                  digital identity will remain
                  inactive.
                </span>
              </div>

              <div className="verification-modal-actions">

                <button
                  type="button"
                  className="verification-cancel-button"
                  onClick={closeRejectModal}
                  disabled={
                    !!actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="verification-reject-button large"
                  disabled={
                    !!actionLoading ||
                    !rejectionReason.trim()
                  }
                >
                  {actionLoading ===
                  `reject-${selectedResident._id}`
                    ? "Rejecting..."
                    : "Reject Resident"}
                </button>

              </div>

            </form>

          </div>
        )}

    </div>
  );
};

export default VerificationPage;