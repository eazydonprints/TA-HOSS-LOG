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
        setError("Unable to load residents.");
      }
    } catch (err) {
      console.error("IDENTITY PAGE ERROR:", err);

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

  const filteredResidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return residents.filter((resident) => {
      const fullName = [
        resident.firstName,
        resident.middleName,
        resident.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        resident.residentId?.toLowerCase().includes(query) ||
        resident.phoneNumber?.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "active") {
        matchesFilter = resident.identityStatus === "active";
      }

      if (filter === "pending") {
        matchesFilter = resident.identityStatus === "pending";
      }

      if (filter === "qr") {
        matchesFilter = Boolean(resident.qrToken);
      }

      if (filter === "noqr") {
        matchesFilter = !resident.qrToken;
      }

      return matchesSearch && matchesFilter;
    });
  }, [residents, search, filter]);

  const statistics = useMemo(() => {
    return {
      total: residents.length,

      active: residents.filter(
        (resident) => resident.identityStatus === "active"
      ).length,

      pending: residents.filter(
        (resident) => resident.identityStatus === "pending"
      ).length,

      qr: residents.filter((resident) => Boolean(resident.qrToken)).length,
    };
  }, [residents]);

  const getFullName = (resident) => {
    return [resident.firstName, resident.middleName, resident.lastName]
      .filter(Boolean)
      .join(" ");
  };

  const generateQR = async (resident) => {
    try {
      setGeneratingId(resident._id);
      setError("");
      setSuccess("");

      // Provide required body parameters in case endpoint expects resident payload
      const response = await api.post(
        `/identity/${resident._id}/qr`,
        {
          residentId: resident._id,
          action: "generate",
        }
      );

      if (response.data?.success) {
        setSuccess(
          `QR identity generated for ${getFullName(resident)}.`
        );

        await loadResidents();

        navigate(`/resident/${resident._id}/qr`);
      } else {
        setError(
          response.data?.message || "Unable to generate QR identity."
        );
      }
    } catch (err) {
      console.error("GENERATE RESIDENT QR ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Unable to generate resident QR identity."
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const viewIdentity = (resident) => {
    navigate(`/resident/${resident._id}/identity`);
  };

  const viewQR = (resident) => {
    navigate(`/resident/${resident._id}/qr`);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="dashboard-page identity-page">
      <div className="dashboard-header">
        <div>
          <div className="breadcrumb">TA-HOSS LOG / Identity & QR</div>

          <h1>Identity & QR</h1>

          <p>
            Manage resident digital identities, QR verification and identity
            status.
          </p>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {success && <div className="dashboard-success">{success}</div>}

      <section className="identity-stat-grid">
        <div className="identity-stat-card">
          <span className="identity-stat-icon">♙</span>

          <div>
            <span>Total Residents</span>
            <strong>{statistics.total}</strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <span className="identity-stat-icon">✓</span>

          <div>
            <span>Active Identities</span>
            <strong>{statistics.active}</strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <span className="identity-stat-icon">◷</span>

          <div>
            <span>Pending Identity</span>
            <strong>{statistics.pending}</strong>
          </div>
        </div>

        <div className="identity-stat-card">
          <span className="identity-stat-icon">▣</span>

          <div>
            <span>QR Generated</span>
            <strong>{statistics.qr}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="panel-header identity-toolbar">
          <div>
            <h2>Resident Digital Identities</h2>

            <p>Select a resident to view or manage their identity.</p>
          </div>

          <div className="identity-tools">
            <input
              type="text"
              placeholder="Search resident..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All Residents</option>

              <option value="active">Active Identity</option>

              <option value="pending">Pending Identity</option>

              <option value="qr">QR Generated</option>

              <option value="noqr">No QR</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner" />

            <p>Loading resident identities...</p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="empty-state">
            <strong>No residents found</strong>

            <span>
              No resident identity records match your search or filter.
            </span>
          </div>
        ) : (
          <div className="identity-table-wrapper">
            <table className="identity-table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Resident ID</th>
                  <th>Verification</th>
                  <th>Identity</th>
                  <th>QR</th>
                  <th>Issued</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredResidents.map((resident) => (
                  <tr key={resident._id}>
                    <td>
                      <div className="identity-resident">
                        <div className="identity-avatar">
                          {resident.photo ? (
                            <img
                              src={
                                typeof resident.photo === "string"
                                  ? resident.photo
                                  : resident.photo?.url
                              }
                              alt={getFullName(resident)}
                            />
                          ) : (
                            resident.firstName?.charAt(0)?.toUpperCase() || "?"
                          )}
                        </div>

                        <div>
                          <strong>{getFullName(resident)}</strong>

                          <span>{resident.gender || "N/A"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>{resident.residentId}</strong>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          resident.verificationStatus === "verified"
                            ? "verified"
                            : resident.verificationStatus === "rejected"
                            ? "rejected"
                            : "pending"
                        }`}
                      >
                        {resident.verificationStatus}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          resident.identityStatus === "active"
                            ? "verified"
                            : "pending"
                        }`}
                      >
                        {resident.identityStatus || "pending"}
                      </span>
                    </td>

                    <td>
                      {resident.qrToken ? (
                        <span className="qr-status available">
                          ✓ Available
                        </span>
                      ) : (
                        <span className="qr-status">Not generated</span>
                      )}
                    </td>

                    <td>{formatDate(resident.identityIssuedAt)}</td>

                    <td>
                      <div className="identity-action-buttons">
                        <button
                          type="button"
                          onClick={() => viewIdentity(resident)}
                        >
                          View
                        </button>

                        {resident.qrToken ? (
                          <button
                            type="button"
                            onClick={() => viewQR(resident)}
                          >
                            QR
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={generatingId === resident._id}
                            onClick={() => generateQR(resident)}
                          >
                            {generatingId === resident._id
                              ? "Generating..."
                              : "Generate QR"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default IdentityPage;