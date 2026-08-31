import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentResidents, setRecentResidents] = useState([]);
  const [mapData, setMapData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardResponse,
          residentsResponse,
          mapResponse,
        ] = await Promise.all([
          api.get("/dashboard"),
          api.get("/residents?page=1&limit=5"),
          api.get("/map/households"),
        ]);

        setStats(
            dashboardResponse.data?.dashboard ||
            dashboardResponse.data?.data ||
            dashboardResponse.data
        );

        const residents =
          residentsResponse.data?.data ||
          residentsResponse.data?.residents ||
          [];

        setRecentResidents(residents);

        setMapData(
          mapResponse.data?.data || []
        );
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          err.response?.data?.message ||
          "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const totalHouseholds =
    stats?.totalHouseholds ??
    stats?.households ??
    0;

  const totalResidents =
    stats?.totalResidents ??
    stats?.residents ??
    0;

  const verifiedResidents =
    stats?.verifiedResidents ??
    stats?.verified ??
    0;

  const pendingResidents =
    stats?.pendingResidents ??
    stats?.pending ??
    0;

  return (
    <div className="dashboard-page">

      <div className="dashboard-header">
        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Dashboard
          </div>

          <h1>Community Dashboard</h1>

          <p>
            Overview of Ta-hoss Community
            registration and demographic data.
          </p>
        </div>

        <div className="dashboard-actions">
          <Link
            to="/households"
            className="dashboard-button secondary"
          >
            View Households
          </Link>

          <Link
            to="/residents"
            className="dashboard-button primary"
          >
            + Register Resident
          </Link>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading community data...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">

            <div className="stat-card dashboard-stat">
              <div className="stat-top">
                <span className="stat-label">
                  TOTAL HOUSEHOLDS
                </span>

                <span className="stat-symbol">
                  ⌂
                </span>
              </div>

              <strong>
                {totalHouseholds}
              </strong>

              <span className="stat-description">
                Registered households
              </span>
            </div>

            <div className="stat-card dashboard-stat">
              <div className="stat-top">
                <span className="stat-label">
                  TOTAL RESIDENTS
                </span>

                <span className="stat-symbol">
                  ♙
                </span>
              </div>

              <strong>
                {totalResidents}
              </strong>

              <span className="stat-description">
                Registered community members
              </span>
            </div>

            <div className="stat-card dashboard-stat">
              <div className="stat-top">
                <span className="stat-label">
                  VERIFIED
                </span>

                <span className="stat-symbol verified">
                  ✓
                </span>
              </div>

              <strong>
                {verifiedResidents}
              </strong>

              <span className="stat-description">
                Verified residents
              </span>
            </div>

            <div className="stat-card dashboard-stat">
              <div className="stat-top">
                <span className="stat-label">
                  PENDING
                </span>

                <span className="stat-symbol pending">
                  !
                </span>
              </div>

              <strong>
                {pendingResidents}
              </strong>

              <span className="stat-description">
                Awaiting verification
              </span>
            </div>

          </div>

          <div className="dashboard-grid">

            <section className="dashboard-panel map-preview">
              <div className="panel-header">
                <div>
                  <h2>Community Map</h2>

                  <p>
                    Mapped households in
                    Ta-hoss Community
                  </p>
                </div>

                <Link to="/map">
                  View Map →
                </Link>
              </div>

              <div className="map-preview-area">

                {mapData.length > 0 ? (
                  <>
                    <div className="map-grid-background" />

                    {mapData
                      .slice(0, 30)
                      .map((marker, index) => (
                        <div
                          key={
                            marker.householdId ||
                            index
                          }
                          className="map-marker"
                          title={
                            marker.householdId
                          }
                          style={{
                            left:
                              `${15 + ((index * 17) % 70)}%`,
                            top:
                              `${20 + ((index * 29) % 60)}%`,
                          }}
                        >
                          ●
                        </div>
                      ))}

                    <div className="map-center-label">
                      <strong>
                        {mapData.length}
                      </strong>

                      <span>
                        mapped households
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="empty-map">
                    <div>⌖</div>

                    <strong>
                      No mapped households
                    </strong>

                    <span>
                      Capture GPS locations
                      during registration.
                    </span>
                  </div>
                )}

              </div>
            </section>

            <section className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>Community Summary</h2>

                  <p>
                    Current registration status
                  </p>
                </div>
              </div>

              <div className="summary-list">

                <div className="summary-row">
                  <span>
                    Registered households
                  </span>

                  <strong>
                    {totalHouseholds}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Registered residents
                  </span>

                  <strong>
                    {totalResidents}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Verified residents
                  </span>

                  <strong>
                    {verifiedResidents}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Pending verification
                  </span>

                  <strong>
                    {pendingResidents}
                  </strong>
                </div>

              </div>

              <Link
                to="/analytics"
                className="summary-link"
              >
                View demographic analytics →
              </Link>
            </section>

          </div>

          <section className="dashboard-panel recent-panel">

            <div className="panel-header">
              <div>
                <h2>
                  Recent Registrations
                </h2>

                <p>
                  Latest residents added to
                  the community register
                </p>
              </div>

              <Link to="/residents">
                View all →
              </Link>
            </div>

            {recentResidents.length > 0 ? (
              <div className="resident-table-wrapper">

                <table className="resident-table">

                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Gender</th>
                      <th>Household</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentResidents.map(
                      (resident) => (
                        <tr
                          key={
                            resident._id
                          }
                        >
                          <td>
                            <div className="resident-name">
                              <div className="resident-avatar">
                                {(
                                  resident.firstName ||
                                  resident.fullName ||
                                  "R"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {resident.fullName ||
                                    [
                                      resident.firstName,
                                      resident.middleName,
                                      resident.lastName,
                                    ]
                                      .filter(Boolean)
                                      .join(" ") ||
                                    "Unnamed Resident"}
                                </strong>

                                <span>
                                  {resident.residentId ||
                                    "No ID"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {resident.gender ||
                              "—"}
                          </td>

                          <td>
                            {resident.household
                              ?.householdId ||
                              resident.householdId ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                resident.verificationStatus ===
                                "verified"
                                  ? "status-verified"
                                  : "status-pending"
                              }`}
                            >
                              {resident.verificationStatus ||
                                "pending"}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>

              </div>
            ) : (
              <div className="empty-table">
                <div>♙</div>

                <strong>
                  No residents registered yet
                </strong>

                <span>
                  Registered residents will
                  appear here.
                </span>
              </div>
            )}

          </section>

        </>
      )}
    </div>
  );
};

export default Dashboard;