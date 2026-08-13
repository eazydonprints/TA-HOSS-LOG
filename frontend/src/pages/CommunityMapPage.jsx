import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommunityMap from "../components/CommunityMap";
import api from "../services/api";

const CommunityMapPage = () => {
  const navigate = useNavigate();

  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadHouseholds = async () => {
      try {
        setLoading(true);

        const response =
          await api.get("/map/households");

        console.log(
          "TA-HOSS MAP RESPONSE:",
          response.data
        );

        setHouseholds(
          Array.isArray(response.data?.data)
            ? response.data.data
            : []
        );

      } catch (err) {
        console.error("MAP ERROR:", err);

        setError(
          err.response?.data?.message ||
          "Unable to load household locations."
        );
      } finally {
        setLoading(false);
      }
    };

    loadHouseholds();
  }, []);

  const filteredHouseholds = useMemo(() => {

    let results = [...households];

    // Search
    if (search.trim()) {

      const query =
        search.toLowerCase().trim();

      results = results.filter(
        household =>
          String(
            household.householdId || ""
          )
            .toLowerCase()
            .includes(query) ||

          String(
            household.compound || ""
          )
            .toLowerCase()
            .includes(query) ||

          String(
            household.houseNumber || ""
          )
            .toLowerCase()
            .includes(query)
      );
    }

    // Verification filter
    if (filter === "verified") {

      results = results.filter(
        household =>
          Number(household.verifiedCount) >
          0
      );

    }

    if (filter === "pending") {

      results = results.filter(
        household =>
          Number(household.verifiedCount) <
          Number(household.residentCount)
      );

    }

    return results;

  }, [households, search, filter]);


  const mappedHouseholds =
    households.filter(
      household =>
        Number.isFinite(
          Number(household.latitude)
        ) &&
        Number.isFinite(
          Number(household.longitude)
        )
    );


  const mappedCount =
    mappedHouseholds.length;


  const totalHouseholds =
    households.length;


  const gpsCoverage =
    totalHouseholds > 0
      ? Math.round(
          (mappedCount /
            totalHouseholds) *
            100
        )
      : 0;


  const verifiedHouseholds =
    households.filter(
      household =>
        Number(household.verifiedCount) ===
        Number(household.residentCount)
    ).length;


  const pendingHouseholds =
    households.filter(
      household =>
        Number(household.verifiedCount) <
        Number(household.residentCount)
    ).length;


  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">

        <div>

          <div className="breadcrumb">
            TA-HOSS LOG / Community Map
          </div>

          <h1>
            Ta-hoss Community Map
          </h1>

          <p>
            Geographic distribution of registered
            households in Ta-hoss Community.
          </p>

        </div>

        <div className="map-stat">

          <strong>
            {mappedCount}
          </strong>

          <span>
            Mapped Households
          </span>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      {/* STATISTICS */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <span>
            Total Households
          </span>

          <strong>
            {totalHouseholds}
          </strong>

        </div>


        <div className="stat-card">

          <span>
            GPS Mapped
          </span>

          <strong>
            {mappedCount}
          </strong>

        </div>


        <div className="stat-card">

          <span>
            Verified
          </span>

          <strong>
            {verifiedHouseholds}
          </strong>

        </div>


        <div className="stat-card">

          <span>
            Pending
          </span>

          <strong>
            {pendingHouseholds}
          </strong>

        </div>


        <div className="stat-card">

          <span>
            GPS Coverage
          </span>

          <strong>
            {gpsCoverage}%
          </strong>

        </div>

      </div>


      {/* SEARCH AND FILTER */}

      <section className="dashboard-panel">

        <div className="map-toolbar">

          <div className="map-search">

            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Search household, compound or house number..."
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
            />

          </div>


          <div className="map-filters">

            <button
              className={
                filter === "all"
                  ? "map-filter active"
                  : "map-filter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All
            </button>


            <button
              className={
                filter === "verified"
                  ? "map-filter active"
                  : "map-filter"
              }
              onClick={() =>
                setFilter("verified")
              }
            >
              Verified
            </button>


            <button
              className={
                filter === "pending"
                  ? "map-filter active"
                  : "map-filter"
              }
              onClick={() =>
                setFilter("pending")
              }
            >
              Pending
            </button>

          </div>

        </div>


        <div className="map-result-count">

          Showing{" "}
          <strong>
            {filteredHouseholds.length}
          </strong>{" "}
          of{" "}
          <strong>
            {households.length}
          </strong>{" "}
          households

        </div>


        {/* MAP */}

        {loading ? (

          <div className="dashboard-loading">

            <div className="loading-spinner" />

            <p>
              Loading community map...
            </p>

          </div>

        ) : (

          <CommunityMap
            households={filteredHouseholds}
          />

        )}

      </section>


      {/* HOUSEHOLD LIST */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <h2>
              Mapped Households
            </h2>

            <p>
              Select a household to view its
              complete record.
            </p>

          </div>

        </div>


        <div className="household-list">

          {filteredHouseholds.length === 0 ? (

            <div className="empty-state">

              <strong>
                No households found
              </strong>

              <span>
                Try a different search or filter.
              </span>

            </div>

          ) : (

            filteredHouseholds.map(
              household => (

                <div
                  className="household-list-item"
                  key={household.householdId}
                >

                  <div>

                    <strong>
                      {household.householdId}
                    </strong>

                    <span>
                      {household.compound ||
                        "No compound"}{" "}
                      •{" "}
                      {household.houseNumber ||
                        "No house number"}
                    </span>

                  </div>


                  <div className="household-list-meta">

                    <span>
                      {household.residentCount}{" "}
                      residents
                    </span>

                    <span>
                      {household.verifiedCount}{" "}
                      verified
                    </span>

                    <button
                      onClick={() =>
                        navigate(
                            `/households/${household._id}`
                        )
                    }
                    >
                        View Household
                        </button>

                  </div>

                </div>

              )
            )

          )}

        </div>

      </section>

    </div>
  );
};

export default CommunityMapPage;