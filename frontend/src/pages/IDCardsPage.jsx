import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

import "./IDCardsPage.css";

const IDCardsPage = () => {
  const navigate = useNavigate();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [error, setError] = useState("");

  const loadResidents = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/residents", {
        params: {
          limit: 1000,
        },
      });

      if (
        response.data?.success &&
        Array.isArray(response.data?.data)
      ) {
        setResidents(response.data.data);
      } else {
        setResidents([]);

        setError(
          "Unable to retrieve resident records."
        );
      }
    } catch (err) {
      console.error(
        "ID CARDS RESIDENT LOAD ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load resident records."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const getFullName = (resident) => {
    return [
      resident?.firstName,
      resident?.middleName,
      resident?.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getInitials = (resident) => {
    const first =
      resident?.firstName
        ?.charAt(0)
        ?.toUpperCase() || "";

    const last =
      resident?.lastName
        ?.charAt(0)
        ?.toUpperCase() || "";

    return `${first}${last}` || "?";
  };

  const isEligible = (resident) => {
    return (
      resident?.verificationStatus ===
        "verified" &&
      resident?.identityStatus === "active"
    );
  };

  const hasQR = (resident) => {
    return Boolean(resident?.qrToken);
  };

  const filteredResidents = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return residents.filter((resident) => {
      const fullName =
        getFullName(resident).toLowerCase();

      const residentId =
        resident?.residentId
          ?.toLowerCase() || "";

      const phone =
        resident?.phoneNumber
          ?.toLowerCase() || "";

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        residentId.includes(normalizedSearch) ||
        phone.includes(normalizedSearch);

      let matchesStatus = true;

      if (statusFilter === "eligible") {
        matchesStatus = isEligible(resident);
      }

      if (statusFilter === "qr") {
        matchesStatus =
          isEligible(resident) &&
          hasQR(resident);
      }

      if (statusFilter === "pending") {
        matchesStatus =
          resident?.verificationStatus ===
          "pending";
      }

      if (statusFilter === "rejected") {
        matchesStatus =
          resident?.verificationStatus ===
          "rejected";
      }

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    residents,
    search,
    statusFilter,
  ]);

  const statistics = useMemo(() => {
    const total = residents.length;

    const verified = residents.filter(
      (resident) =>
        resident?.verificationStatus ===
        "verified"
    ).length;

    const eligible = residents.filter(
      (resident) => isEligible(resident)
    ).length;

    const qrReady = residents.filter(
      (resident) =>
        isEligible(resident) &&
        hasQR(resident)
    ).length;

    const pending = residents.filter(
      (resident) =>
        resident?.verificationStatus ===
        "pending"
    ).length;

    return {
      total,
      verified,
      eligible,
      qrReady,
      pending,
    };
  }, [residents]);

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

  const handleOpenCard = (resident) => {
    navigate(
      `/resident/${resident._id}/id-card`
    );
  };

  const handleOpenProfile = (resident) => {
    navigate(
      `/resident/${resident._id}`
    );
  };

  const handleGenerateCard = (resident) => {
    if (!isEligible(resident)) {
      return;
    }

    navigate(
      `/resident/${resident._id}/id-card`
    );
  };

  return (
    <div className="dashboard-page id-cards-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header id-cards-header">

        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Identity / ID Cards
          </div>

          <h1>
            Resident ID Cards
          </h1>

          <p>
            Generate, view and manage official
            TA-HOSS LOG resident identification
            cards.
          </p>
        </div>

        <button
          className="id-card-refresh-button"
          onClick={() =>
            loadResidents(true)
          }
          disabled={refreshing}
        >
          {refreshing
            ? "↻ Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>


      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <section className="id-card-stat-grid">

        <div className="id-card-stat-card">
          <div className="id-card-stat-icon">
            ♙
          </div>

          <div>
            <span>
              Total Residents
            </span>

            <strong>
              {statistics.total}
            </strong>
          </div>
        </div>


        <div className="id-card-stat-card">
          <div className="id-card-stat-icon verified">
            ✓
          </div>

          <div>
            <span>
              Verified Residents
            </span>

            <strong>
              {statistics.verified}
            </strong>
          </div>
        </div>


        <div className="id-card-stat-card">
          <div className="id-card-stat-icon active">
            🪪
          </div>

          <div>
            <span>
              ID Eligible
            </span>

            <strong>
              {statistics.eligible}
            </strong>
          </div>
        </div>


        <div className="id-card-stat-card">
          <div className="id-card-stat-icon qr">
            ▣
          </div>

          <div>
            <span>
              QR Ready
            </span>

            <strong>
              {statistics.qrReady}
            </strong>
          </div>
        </div>

      </section>


      {/* =====================================================
          INFORMATION BANNER
      ====================================================== */}

      <section className="id-card-info-banner">

        <div className="id-card-info-icon">
          i
        </div>

        <div>
          <strong>
            ID card eligibility
          </strong>

          <p>
            A resident must have a
            <strong>
              verified
            </strong>{" "}
            verification status and an
            <strong>
              active
            </strong>{" "}
            digital identity before an
            official TA-HOSS LOG ID card
            can be generated.
          </p>
        </div>

      </section>


      {/* =====================================================
          REGISTRY PANEL
      ====================================================== */}

      <section className="dashboard-panel id-card-registry-panel">

        <div className="panel-header">

          <div>
            <h2>
              ID Card Registry
            </h2>

            <p>
              Residents registered in the
              community management system.
            </p>
          </div>

          <div className="id-card-record-count">
            {filteredResidents.length}
            {" "}
            record
            {filteredResidents.length === 1
              ? ""
              : "s"}
          </div>

        </div>


        {/* ===================================================
            FILTERS
        ==================================================== */}

        <div className="id-card-filters">

          <div className="id-card-search">

            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search resident name, ID or phone..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                className="id-card-clear-search"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>


          <div className="id-card-filter-select">

            <label htmlFor="id-card-status-filter">
              Status
            </label>

            <select
              id="id-card-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Residents
              </option>

              <option value="eligible">
                ID Eligible
              </option>

              <option value="qr">
                QR Ready
              </option>

              <option value="pending">
                Verification Pending
              </option>

              <option value="rejected">
                Verification Rejected
              </option>
            </select>

          </div>

        </div>


        {/* ===================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="id-card-loading">

            <div className="loading-spinner" />

            <p>
              Loading resident ID
              registry...
            </p>

          </div>
        )}


        {/* ===================================================
            ERROR
        ==================================================== */}

        {!loading && error && (
          <div className="id-card-error">

            <strong>
              Unable to load ID card
              registry
            </strong>

            <p>
              {error}
            </p>

            <button
              onClick={() =>
                loadResidents()
              }
            >
              Try Again
            </button>

          </div>
        )}


        {/* ===================================================
            EMPTY
        ==================================================== */}

        {!loading &&
          !error &&
          filteredResidents.length ===
            0 && (
            <div className="id-card-empty">

              <div className="id-card-empty-icon">
                🪪
              </div>

              <h3>
                No residents found
              </h3>

              <p>
                {search
                  ? "No resident matches your search criteria."
                  : statusFilter !== "all"
                  ? "There are no residents matching this status."
                  : "No resident records are currently available."}
              </p>

              {(search ||
                statusFilter !==
                  "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "all"
                    );
                  }}
                >
                  Clear Filters
                </button>
              )}

            </div>
          )}


        {/* ===================================================
            DESKTOP TABLE
        ==================================================== */}

        {!loading &&
          !error &&
          filteredResidents.length >
            0 && (
            <div className="id-card-table-wrapper">

              <table className="id-card-table">

                <thead>
                  <tr>
                    <th>
                      Resident
                    </th>

                    <th>
                      Resident ID
                    </th>

                    <th>
                      Household
                    </th>

                    <th>
                      Verification
                    </th>

                    <th>
                      Identity
                    </th>

                    <th>
                      QR
                    </th>

                    <th>
                      Registered
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>


                <tbody>

                  {filteredResidents.map(
                    (resident) => {
                      const eligible =
                        isEligible(
                          resident
                        );

                      const qrReady =
                        hasQR(
                          resident
                        );

                      return (
                        <tr
                          key={
                            resident._id
                          }
                        >

                          {/* RESIDENT */}

                          <td>

                            <div className="id-card-resident-cell">

                              <div className="id-card-avatar">

                                {resident.photo ? (
                                  <img
                                    src={
                                      resident.photo
                                    }
                                    alt={getFullName(
                                      resident
                                    )}
                                  />
                                ) : (
                                  <span>
                                    {getInitials(
                                      resident
                                    )}
                                  </span>
                                )}

                              </div>

                              <div className="id-card-resident-name">

                                <strong>
                                  {getFullName(
                                    resident
                                  )}
                                </strong>

                                <span>
                                  {resident.gender ||
                                    "N/A"}
                                </span>

                              </div>

                            </div>

                          </td>


                          {/* RESIDENT ID */}

                          <td>

                            <span className="resident-id-value">
                              {resident.residentId ||
                                "N/A"}
                            </span>

                          </td>


                          {/* HOUSEHOLD */}

                          <td>

                            <div className="id-card-household">

                              <strong>
                                {resident
                                  .household
                                  ?.householdId ||
                                  "N/A"}
                              </strong>

                              <span>
                                {resident
                                  .household
                                  ?.compound ||
                                  "No compound"}
                              </span>

                            </div>

                          </td>


                          {/* VERIFICATION */}

                          <td>

                            <span
                              className={`id-status-badge ${
                                resident.verificationStatus ===
                                "verified"
                                  ? "verified"
                                  : resident.verificationStatus ===
                                    "rejected"
                                  ? "rejected"
                                  : "pending"
                              }`}
                            >
                              <span className="id-status-dot" />

                              {resident.verificationStatus ||
                                "pending"}
                            </span>

                          </td>


                          {/* IDENTITY */}

                          <td>

                            <span
                              className={`id-status-badge ${
                                resident.identityStatus ===
                                "active"
                                  ? "verified"
                                  : resident.identityStatus ===
                                    "suspended"
                                  ? "rejected"
                                  : "pending"
                              }`}
                            >
                              <span className="id-status-dot" />

                              {resident.identityStatus ||
                                "pending"}
                            </span>

                          </td>


                          {/* QR */}

                          <td>

                            {qrReady ? (
                              <span className="qr-ready-badge">
                                ✓ Ready
                              </span>
                            ) : eligible ? (
                              <span className="qr-pending-badge">
                                Not generated
                              </span>
                            ) : (
                              <span className="qr-disabled-badge">
                                Unavailable
                              </span>
                            )}

                          </td>


                          {/* REGISTERED */}

                          <td>

                            <span className="id-card-date">
                              {formatDate(
                                resident.createdAt
                              )}
                            </span>

                          </td>


                          {/* ACTIONS */}

                          <td>

                            <div className="id-card-actions">

                              <button
                                type="button"
                                className="id-card-action-button view"
                                title="View resident profile"
                                onClick={() =>
                                  handleOpenProfile(
                                    resident
                                  )
                                }
                              >
                                View
                              </button>


                              <button
                                type="button"
                                className={`id-card-action-button primary ${
                                  !eligible
                                    ? "disabled"
                                    : ""
                                }`}
                                title={
                                  eligible
                                    ? "Open ID card"
                                    : "Resident is not eligible for an ID card"
                                }
                                disabled={
                                  !eligible
                                }
                                onClick={() =>
                                  handleGenerateCard(
                                    resident
                                  )
                                }
                              >
                                🪪 Card
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
          ELIGIBILITY LEGEND
      ====================================================== */}

      <section className="dashboard-panel id-card-legend-panel">

        <div className="panel-header">

          <div>
            <h2>
              ID Card Status Guide
            </h2>

            <p>
              Understanding resident card
              eligibility.
            </p>
          </div>

        </div>


        <div className="id-card-legend-grid">

          <div className="id-card-legend-item">

            <span className="id-card-legend-icon success">
              ✓
            </span>

            <div>
              <strong>
                ID Eligible
              </strong>

              <p>
                Resident is verified and
                has an active digital
                identity.
              </p>
            </div>

          </div>


          <div className="id-card-legend-item">

            <span className="id-card-legend-icon pending">
              ◷
            </span>

            <div>
              <strong>
                Verification Pending
              </strong>

              <p>
                Resident must be reviewed
                by an authorized verification
                officer.
              </p>
            </div>

          </div>


          <div className="id-card-legend-item">

            <span className="id-card-legend-icon qr">
              ▣
            </span>

            <div>
              <strong>
                QR Ready
              </strong>

              <p>
                Resident already has a
                generated QR identity token.
              </p>
            </div>

          </div>


          <div className="id-card-legend-item">

            <span className="id-card-legend-icon unavailable">
              !
            </span>

            <div>
              <strong>
                Not Eligible
              </strong>

              <p>
                Resident cannot receive an
                official ID card until identity
                requirements are satisfied.
              </p>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
};

export default IDCardsPage;