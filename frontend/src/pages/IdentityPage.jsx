import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import "./IdentityPage.css";

const IdentityPage = () => {
  const navigate = useNavigate();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadResidents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/residents", {
        params: {
          limit: 100,
        },
      });

      if (response.data?.success) {
        setResidents(response.data.data || []);
      } else {
        setError(
          response.data?.message ||
            "Unable to load residents."
        );
      }
    } catch (err) {
      console.error(
        "IDENTITY PAGE ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load resident identity records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const getFullName = (resident) => {
    return [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const filteredResidents = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return residents.filter((resident) => {
      const fullName =
        getFullName(resident).toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        resident.residentId
          ?.toLowerCase()
          .includes(query) ||
        resident.phoneNumber
          ?.toLowerCase()
          .includes(query);

      let matchesFilter = true;

      if (filter === "active") {
        matchesFilter =
          resident.identityStatus === "active";
      }

      if (filter === "pending") {
        matchesFilter =
          resident.identityStatus === "pending";
      }

      if (filter === "qr") {
        matchesFilter =
          Boolean(resident.qrToken);
      }

      if (filter === "noqr") {
        matchesFilter =
          !resident.qrToken;
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    residents,
    search,
    filter,
  ]);

  const statistics = useMemo(() => {
    return {
      total: residents.length,

      active: residents.filter(
        (resident) =>
          resident.identityStatus === "active"
      ).length,

      pending: residents.filter(
        (resident) =>
          resident.identityStatus === "pending"
      ).length,

      qr: residents.filter(
        (resident) =>
          Boolean(resident.qrToken)
      ).length,
    };
  }, [residents]);

  const generateQR = async (
    resident
  ) => {
    try {
      setGeneratingId(resident._id);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/identity/${resident._id}/qr`,
        {
          residentId: resident._id,
          action: "generate",
        }
      );

      if (response.data?.success) {
        setSuccess(
          `QR identity generated for ${getFullName(
            resident
          )}.`
        );

        await loadResidents();

        navigate(
          `/resident/${resident._id}/qr`
        );
      } else {
        setError(
          response.data?.message ||
            "Unable to generate QR identity."
        );
      }
    } catch (err) {
      console.error(
        "GENERATE RESIDENT QR ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to generate resident QR identity."
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const viewIdentity = (resident) => {
    navigate(
      `/resident/${resident._id}/identity`
    );
  };

  const viewQR = (resident) => {
    navigate(
      `/resident/${resident._id}/qr`
    );
  };

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
        month: "short",
        year: "numeric",
      }
    );
  };

  const getStatusClass = (
    status,
    type = "verification"
  ) => {
    if (type === "identity") {
      return status === "active"
        ? "verified"
        : "pending";
    }

    if (status === "verified") {
      return "verified";
    }

    if (status === "rejected") {
      return "rejected";
    }

    return "pending";
  };

  const getPhoto = (resident) => {
    if (!resident?.photo) {
      return "";
    }

    if (
      typeof resident.photo ===
      "string"
    ) {
      return resident.photo;
    }

    return (
      resident.photo?.url || ""
    );
  };

  return (
    <div className="dashboard-page identity-page">
      {/* HEADER */}

      <div className="dashboard-header identity-page-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Identity & QR
          </div>

          <h1>
            Identity & QR
          </h1>

          <p>
            Manage resident digital identities,
            QR verification and identity status.
          </p>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="identity-alert identity-alert-error">
          <div className="identity-alert-icon">
            !
          </div>

          <div>
            <strong>
              Action required
            </strong>

            <span>
              {error}
            </span>
          </div>
        </div>
      )}

      {success && (
        <div className="identity-alert identity-alert-success">
          <div className="identity-alert-icon">
            ✓
          </div>

          <div>
            <strong>
              Successful
            </strong>

            <span>
              {success}
            </span>
          </div>
        </div>
      )}

      {/* STATISTICS */}

      <section className="identity-stat-grid">
        <div className="identity-stat-card">
          <div className="identity-stat-icon">
            ♙
          </div>

          <div className="identity-stat-content">
            <span>
              Total Residents
            </span>

            <strong>
              {statistics.total}
            </strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <div className="identity-stat-icon">
            ✓
          </div>

          <div className="identity-stat-content">
            <span>
              Active Identities
            </span>

            <strong>
              {statistics.active}
            </strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <div className="identity-stat-icon">
            ◷
          </div>

          <div className="identity-stat-content">
            <span>
              Pending Identity
            </span>

            <strong>
              {statistics.pending}
            </strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <div className="identity-stat-icon">
            ▣
          </div>

          <div className="identity-stat-content">
            <span>
              QR Generated
            </span>

            <strong>
              {statistics.qr}
            </strong>
          </div>
        </div>
      </section>

      {/* MAIN PANEL */}

      <section className="dashboard-panel identity-main-panel">
        <div className="panel-header identity-toolbar">
          <div className="identity-toolbar-title">
            <h2>
              Resident Digital Identities
            </h2>

            <p>
              Select a resident to view,
              manage or generate their
              digital identity.
            </p>
          </div>

          <div className="identity-tools">
            <div className="identity-search">
              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search resident..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Residents
              </option>

              <option value="active">
                Active Identity
              </option>

              <option value="pending">
                Pending Identity
              </option>

              <option value="qr">
                QR Generated
              </option>

              <option value="noqr">
                No QR
              </option>
            </select>
          </div>
        </div>

        {/* RESULTS SUMMARY */}

        {!loading && (
          <div className="identity-results-summary">
            <span>
              Showing{" "}
              <strong>
                {filteredResidents.length}
              </strong>{" "}
              of{" "}
              <strong>
                {residents.length}
              </strong>{" "}
              residents
            </span>

            {filter !== "all" && (
              <button
                type="button"
                onClick={() =>
                  setFilter("all")
                }
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="identity-loading">
            <div className="loading-spinner" />

            <p>
              Loading resident identities...
            </p>
          </div>
        ) : filteredResidents.length ===
          0 ? (
          <div className="identity-empty-state">
            <div className="identity-empty-icon">
              ♙
            </div>

            <strong>
              No residents found
            </strong>

            <span>
              No resident identity records
              match your search or filter.
            </span>

            {(search ||
              filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Reset search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="identity-table-wrapper">
              <table className="identity-table">
                <thead>
                  <tr>
                    <th>
                      Resident
                    </th>

                    <th>
                      Resident ID
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
                      Issued
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResidents.map(
                    (resident) => (
                      <tr
                        key={
                          resident._id
                        }
                      >
                        <td>
                          <div className="identity-resident">
                            <div className="identity-avatar">
                              {getPhoto(
                                resident
                              ) ? (
                                <img
                                  src={getPhoto(
                                    resident
                                  )}
                                  alt={getFullName(
                                    resident
                                  )}
                                />
                              ) : (
                                resident.firstName
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                "?"
                              )}
                            </div>

                            <div>
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

                        <td>
                          <strong className="identity-resident-id">
                            {resident.residentId ||
                              "N/A"}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              resident.verificationStatus
                            )}`}
                          >
                            {resident.verificationStatus ||
                              "pending"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              resident.identityStatus,
                              "identity"
                            )}`}
                          >
                            {resident.identityStatus ||
                              "pending"}
                          </span>
                        </td>

                        <td>
                          {resident.qrToken ? (
                            <span className="qr-status available">
                              ✓ Available
                            </span>
                          ) : (
                            <span className="qr-status">
                              Not generated
                            </span>
                          )}
                        </td>

                        <td>
                          {formatDate(
                            resident.identityIssuedAt
                          )}
                        </td>

                        <td>
                          <div className="identity-action-buttons">
                            <button
                              type="button"
                              className="identity-view-button"
                              onClick={() =>
                                viewIdentity(
                                  resident
                                )
                              }
                            >
                              View
                            </button>

                            {resident.qrToken ? (
                              <button
                                type="button"
                                className="identity-qr-button"
                                onClick={() =>
                                  viewQR(
                                    resident
                                  )
                                }
                              >
                                QR
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="identity-qr-button"
                                disabled={
                                  generatingId ===
                                  resident._id
                                }
                                onClick={() =>
                                  generateQR(
                                    resident
                                  )
                                }
                              >
                                {generatingId ===
                                resident._id
                                  ? "Generating..."
                                  : "Generate QR"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="identity-mobile-list">
              {filteredResidents.map(
                (resident) => (
                  <article
                    className="identity-mobile-card"
                    key={
                      resident._id
                    }
                  >
                    <div className="identity-mobile-card-header">
                      <div className="identity-resident">
                        <div className="identity-avatar identity-mobile-avatar">
                          {getPhoto(
                            resident
                          ) ? (
                            <img
                              src={getPhoto(
                                resident
                              )}
                              alt={getFullName(
                                resident
                              )}
                            />
                          ) : (
                            resident.firstName
                              ?.charAt(0)
                              ?.toUpperCase() ||
                            "?"
                          )}
                        </div>

                        <div>
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

                      <span className="identity-mobile-id">
                        {resident.residentId ||
                          "N/A"}
                      </span>
                    </div>

                    <div className="identity-mobile-details">
                      <div>
                        <span>
                          Verification
                        </span>

                        <strong>
                          <span
                            className={`status-badge ${getStatusClass(
                              resident.verificationStatus
                            )}`}
                          >
                            {resident.verificationStatus ||
                              "pending"}
                          </span>
                        </strong>
                      </div>

                      <div>
                        <span>
                          Identity
                        </span>

                        <strong>
                          <span
                            className={`status-badge ${getStatusClass(
                              resident.identityStatus,
                              "identity"
                            )}`}
                          >
                            {resident.identityStatus ||
                              "pending"}
                          </span>
                        </strong>
                      </div>

                      <div>
                        <span>
                          QR Identity
                        </span>

                        <strong
                          className={
                            resident.qrToken
                              ? "identity-mobile-available"
                              : ""
                          }
                        >
                          {resident.qrToken
                            ? "Available"
                            : "Not generated"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Issued
                        </span>

                        <strong>
                          {formatDate(
                            resident.identityIssuedAt
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="identity-mobile-actions">
                      <button
                        type="button"
                        className="identity-view-button"
                        onClick={() =>
                          viewIdentity(
                            resident
                          )
                        }
                      >
                        View Identity
                      </button>

                      {resident.qrToken ? (
                        <button
                          type="button"
                          className="identity-qr-button"
                          onClick={() =>
                            viewQR(
                              resident
                            )
                          }
                        >
                          View QR
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="identity-qr-button"
                          disabled={
                            generatingId ===
                            resident._id
                          }
                          onClick={() =>
                            generateQR(
                              resident
                            )
                          }
                        >
                          {generatingId ===
                          resident._id
                            ? "Generating..."
                            : "Generate QR"}
                        </button>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default IdentityPage;