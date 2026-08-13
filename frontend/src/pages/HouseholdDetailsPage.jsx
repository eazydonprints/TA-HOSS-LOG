import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../services/api";

const HouseholdDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [household, setHousehold] =
    useState(null);

  const [residents, setResidents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [residentsLoading, setResidentsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD HOUSEHOLD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadHousehold = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/households/${id}`
          );

        console.log(
          "HOUSEHOLD DETAILS:",
          response.data
        );

        if (
          response.data?.success &&
          response.data?.data
        ) {
          setHousehold(
            response.data.data
          );
        } else {
          setError(
            "Invalid household response."
          );
        }
      } catch (err) {
        console.error(
          "HOUSEHOLD DETAILS ERROR:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load household information."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadHousehold();
    }
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | LOAD RESIDENTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadResidents = async () => {
      try {
        setResidentsLoading(true);

        const response =
          await api.get(
            `/residents?household=${id}`
          );

        console.log(
          "HOUSEHOLD RESIDENTS:",
          response.data
        );

        const data =
          response.data?.data;

        setResidents(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "RESIDENTS ERROR:",
          err
        );

        setResidents([]);
      } finally {
        setResidentsLoading(false);
      }
    };

    if (id) {
      loadResidents();
    }
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading household information...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          {error}
        </div>

        <button
          onClick={() =>
            navigate("/map")
          }
          className="back-button"
        >
          ← Back to Community Map
        </button>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | HOUSEHOLD NOT FOUND
  |--------------------------------------------------------------------------
  */

  if (!household) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <strong>
            Household not found
          </strong>

          <span>
            The requested household
            could not be found.
          </span>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | HOUSEHOLD DATA
  |--------------------------------------------------------------------------
  */

  const location =
    household.location || {};

  const householdHead =
    household.householdHead;

  const fullName = householdHead
    ? [
        householdHead.firstName,
        householdHead.middleName,
        householdHead.lastName,
      ]
        .filter(Boolean)
        .join(" ")
    : "Not assigned";

  /*
  |--------------------------------------------------------------------------
  | DATE FORMATTING
  |--------------------------------------------------------------------------
  */

  const formattedDate =
    household.createdAt
      ? new Date(
          household.createdAt
        ).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )
      : "Not available";

  const gpsDate =
    location.capturedAt
      ? new Date(
          location.capturedAt
        ).toLocaleString(
          "en-GB"
        )
      : "Not available";

  /*
  |--------------------------------------------------------------------------
  | RESIDENT STATISTICS
  |--------------------------------------------------------------------------
  */

  const verifiedResidents =
    residents.filter(
      (resident) =>
        resident.verificationStatus ===
        "verified"
    ).length;

  const activeIdentities =
    residents.filter(
      (resident) =>
        resident.identityStatus ===
        "active"
    ).length;

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const getResidentName = (
    resident
  ) => {
    return [
      resident?.firstName,
      resident?.middleName,
      resident?.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">

        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Community Map /
            Household
          </div>

          <h1>
            {household.householdId}
          </h1>

          <p>
            Household information and
            registered members.
          </p>
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate("/map")
          }
        >
          ← Back to Map
        </button>

      </div>


      {/* SUMMARY */}

      <div className="dashboard-stats">

        <div className="stat-card">
          <span>
            Household
          </span>

          <strong>
            {household.householdId}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Residents
          </span>

          <strong>
            {residents.length}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Verified
          </span>

          <strong>
            {verifiedResidents}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Active IDs
          </span>

          <strong>
            {activeIdentities}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            GPS Accuracy
          </span>

          <strong>
            {location.accuracy !==
            null &&
            location.accuracy !==
              undefined
              ? `±${location.accuracy}m`
              : "N/A"}
          </strong>
        </div>

      </div>


      {/* HOUSEHOLD INFORMATION */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Household Information
            </h2>

            <p>
              Basic information about this
              household.
            </p>
          </div>

        </div>

        <div className="details-grid">

          <div className="detail-item">
            <span>
              Household ID
            </span>

            <strong>
              {household.householdId ||
                "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              Community
            </span>

            <strong>
              {household.community ||
                "Ta-hoss"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              LGA
            </span>

            <strong>
              {household.lga ||
                "Riyom"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              State
            </span>

            <strong>
              {household.state ||
                "Plateau"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              Compound
            </span>

            <strong>
              {household.compound ||
                "Not recorded"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              House Number
            </span>

            <strong>
              {household.houseNumber ||
                "Not recorded"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              Status
            </span>

            <strong>
              {household.status ||
                "active"}
            </strong>
          </div>

          <div className="detail-item">
            <span>
              Registered
            </span>

            <strong>
              {formattedDate}
            </strong>
          </div>

        </div>

        {household.notes && (
          <div className="household-notes">

            <span>
              Notes
            </span>

            <p>
              {household.notes}
            </p>

          </div>
        )}

      </section>


      {/* HOUSEHOLD HEAD */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Household Head
            </h2>

            <p>
              Principal household member.
            </p>
          </div>

        </div>

        <div className="resident-highlight">

          <div className="resident-avatar">
            {householdHead?.firstName
              ?.charAt(0)
              ?.toUpperCase() || "?"}
          </div>

          <div className="resident-highlight-info">

            <strong>
              {fullName}
            </strong>

            <span>
              Resident ID:{" "}
              {householdHead?.residentId ||
                "Not available"}
            </span>

            <span>
              Gender:{" "}
              {householdHead?.gender ||
                "Not recorded"}
            </span>

          </div>

          {householdHead?._id && (
            <button
              onClick={() =>
                navigate(
                  `/resident/${householdHead._id}`
                )
              }
            >
              View Resident
            </button>
          )}

        </div>

      </section>


      {/* RESIDENTS */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Household Residents
            </h2>

            <p>
              All active residents
              registered under this
              household.
            </p>
          </div>

          <span className="resident-count-badge">
            {residents.length} Members
          </span>

        </div>

        {residentsLoading ? (

          <div className="dashboard-loading small">

            <div className="loading-spinner" />

            <p>
              Loading residents...
            </p>

          </div>

        ) : residents.length ===
          0 ? (

          <div className="empty-state">

            <strong>
              No residents found
            </strong>

            <span>
              There are currently no
              residents linked to this
              household.
            </span>

          </div>

        ) : (

          <div className="resident-table-wrapper">

            <table className="resident-table">

              <thead>
                <tr>

                  <th>
                    Resident
                  </th>

                  <th>
                    Gender
                  </th>

                  <th>
                    Relationship
                  </th>

                  <th>
                    Verification
                  </th>

                  <th>
                    Identity
                  </th>

                  <th>
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {residents.map(
                  (resident) => {

                    const name =
                      getResidentName(
                        resident
                      );

                    return (
                      <tr
                        key={
                          resident._id
                        }
                      >

                        <td>

                          <div className="resident-name">

                            <div className="resident-small-avatar">
                              {resident.firstName
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "?"}
                            </div>

                            <div>

                              <strong>
                                {name ||
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

                          <span className="relationship-badge">
                            {resident.relationshipToHead ||
                              "—"}
                          </span>

                        </td>

                        <td>

                          <span
                            className={
                              resident.verificationStatus ===
                              "verified"
                                ? "status-badge verified"
                                : "status-badge pending"
                            }
                          >
                            {resident.verificationStatus ||
                              "pending"}
                          </span>

                        </td>

                        <td>

                          <span
                            className={
                              resident.identityStatus ===
                              "active"
                                ? "status-badge verified"
                                : "status-badge pending"
                            }
                          >
                            {resident.identityStatus ||
                              "pending"}
                          </span>

                        </td>

                        <td>

                          <button
                            className="table-action-button"
                            onClick={() =>
                              navigate(
                                `/resident/${resident._id}`
                              )
                            }
                          >
                            View
                          </button>

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


      {/* GPS INFORMATION */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              GPS Information
            </h2>

            <p>
              Geographic information
              captured during registration.
            </p>
          </div>

        </div>

        <div className="details-grid">

          <div className="detail-item">

            <span>
              Latitude
            </span>

            <strong>
              {location.latitude ??
                "N/A"}
            </strong>

          </div>

          <div className="detail-item">

            <span>
              Longitude
            </span>

            <strong>
              {location.longitude ??
                "N/A"}
            </strong>

          </div>

          <div className="detail-item">

            <span>
              Accuracy
            </span>

            <strong>
              {location.accuracy !==
                null &&
              location.accuracy !==
                undefined
                ? `±${location.accuracy} metres`
                : "N/A"}
            </strong>

          </div>

          <div className="detail-item">

            <span>
              Altitude
            </span>

            <strong>
              {location.altitude !==
                null &&
              location.altitude !==
                undefined
                ? `${location.altitude} m`
                : "N/A"}
            </strong>

          </div>

          <div className="detail-item">

            <span>
              Capture Method
            </span>

            <strong>
              {location.captureMethod ||
                "N/A"}
            </strong>

          </div>

          <div className="detail-item">

            <span>
              Captured
            </span>

            <strong>
              {gpsDate}
            </strong>

          </div>

        </div>

        {location.latitude !==
          null &&
          location.latitude !==
            undefined &&
          location.longitude !==
            null &&
          location.longitude !==
            undefined && (

          <div className="household-actions">

            <button
              onClick={() =>
                navigate(
                  `/map?lat=${location.latitude}&lng=${location.longitude}`
                )
              }
            >
              📍 View on Map
            </button>

          </div>

        )}

      </section>


      {/* HOUSEHOLD MANAGEMENT */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Household Management
            </h2>

            <p>
              Access related TA-HOSS LOG
              records.
            </p>
          </div>

        </div>

        <div className="household-action-grid">

          <button
            onClick={() =>
              navigate(
                `/households/${household._id}/tree`
              )
            }
          >
            <strong>
              🌳 Relationship Tree
            </strong>

            <span>
              View household relationships
            </span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/residents?household=${household._id}`
              )
            }
          >
            <strong>
              👥 Household Residents
            </strong>

            <span>
              View all household members
            </span>
          </button>

          {householdHead?._id && (
            <button
              onClick={() =>
                navigate(
                  `/resident/${householdHead._id}`
                )
              }
            >
              <strong>
                👤 Resident Profile
              </strong>

              <span>
                View household head
              </span>
            </button>
          )}

        </div>

      </section>

    </div>
  );
};

export default HouseholdDetailsPage;