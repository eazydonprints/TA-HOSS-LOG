import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "./ResidentsPage.css";

const EXCEL_EXPORT_ENDPOINT = "/exports/residents/excel";
const PDF_EXPORT_ENDPOINT = "/exports/residents/pdf";

const ResidentsPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [residents, setResidents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);

  const [limit] = useState(15);

  const [refreshing, setRefreshing] = useState(false);

  const [exporting, setExporting] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // =========================================================
  // LOAD RESIDENTS
  // =========================================================

  const loadResidents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await api.get("/residents", {
        params,
      });

      console.log(
        "RESIDENTS RESPONSE:",
        response.data
      );

      if (response.data?.success) {
        setResidents(
          Array.isArray(response.data.data)
            ? response.data.data
            : []
        );

        setPagination(
          response.data.pagination || {
            page,
            limit,
            total:
              response.data.data?.length || 0,
            totalPages: 1,
          }
        );
      } else {
        setError(
          response.data?.message ||
            "Unable to load residents."
        );
      }
    } catch (err) {
      console.error(
        "RESIDENTS ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load residents."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadResidents();
  };

  // =========================================================
  // EXPORT
  // =========================================================

  const downloadBlob = (
    blob,
    filename
  ) => {
    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const getExportParams = () => {
    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    return params;
  };

  const handleExportExcel = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting("excel");
      setError("");

      const response = await api.get(
        EXCEL_EXPORT_ENDPOINT,
        {
          params: getExportParams(),
          responseType: "blob",
        }
      );

      const contentType =
        response.headers?.[
          "content-type"
        ] || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data.text();

        let message =
          "Unable to export residents.";

        try {
          const parsed =
            JSON.parse(text);

          message =
            parsed?.message ||
            message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      downloadBlob(
        response.data,
        `TA-HOSS-Residents-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error(
        "EXCEL EXPORT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to export residents to Excel."
      );
    } finally {
      setExporting("");
    }
  };

  const handleExportPDF = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting("pdf");
      setError("");

      const response = await api.get(
        PDF_EXPORT_ENDPOINT,
        {
          params: getExportParams(),
          responseType: "blob",
        }
      );

      const contentType =
        response.headers?.[
          "content-type"
        ] || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data.text();

        let message =
          "Unable to export residents.";

        try {
          const parsed =
            JSON.parse(text);

          message =
            parsed?.message ||
            message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      downloadBlob(
        response.data,
        `TA-HOSS-Residents-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error(
        "PDF EXPORT ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to export residents to PDF."
      );
    } finally {
      setExporting("");
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

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

  const formatName = (resident) => {
    return [
      resident?.firstName,
      resident?.middleName,
      resident?.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const formatLabel = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "N/A";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  const getResidentId = (resident) => {
    return (
      resident?._id ||
      resident?.id ||
      ""
    );
  };

  const getHouseholdId = (
    resident
  ) => {
    if (!resident?.household) {
      return "";
    }

    if (
      typeof resident.household ===
      "string"
    ) {
      return resident.household;
    }

    return (
      resident.household._id ||
      resident.household.id ||
      ""
    );
  };

  const getHouseholdDisplayId = (
    resident
  ) => {
    if (!resident?.household) {
      return "N/A";
    }

    if (
      typeof resident.household ===
      "string"
    ) {
      return resident.household;
    }

    return (
      resident.household.householdId ||
      resident.household._id ||
      "N/A"
    );
  };

  const getPhotoUrl = (
    resident
  ) => {
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
      resident.photo?.url ||
      ""
    );
  };

  const getInitials = (
    resident
  ) => {
    const first =
      resident?.firstName
        ?.charAt(0)
        ?.toUpperCase() || "";

    const last =
      resident?.lastName
        ?.charAt(0)
        ?.toUpperCase() || "";

    return (
      `${first}${last}` ||
      "?"
    );
  };

  const getVerificationClass = (
    status
  ) => {
    switch (status) {
      case "verified":
        return "status-badge status-success";

      case "rejected":
        return "status-badge status-danger";

      case "pending":
      default:
        return "status-badge status-warning";
    }
  };

  const getIdentityClass = (
    status
  ) => {
    switch (status) {
      case "active":
        return "status-badge status-success";

      case "suspended":
      case "deceased":
      case "moved":
        return "status-badge status-danger";

      case "pending":
      default:
        return "status-badge status-warning";
    }
  };

  const getResidentStatusClass = (
    status
  ) => {
    return status === "active"
      ? "status-badge status-success"
      : "status-badge status-neutral";
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const goToPage = (
    newPage
  ) => {
    if (
      newPage < 1 ||
      newPage >
        pagination.totalPages
    ) {
      return;
    }

    setPage(newPage);
  };

  const paginationPages = useMemo(() => {
    const totalPages =
      pagination.totalPages || 1;

    const currentPage =
      pagination.page || page;

    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) =>
          index + 1
      );
    }

    const pages = new Set([
      1,
      totalPages,
      currentPage,
      currentPage - 1,
      currentPage + 1,
    ]);

    return Array.from(pages)
      .filter(
        (pageNumber) =>
          pageNumber >= 1 &&
          pageNumber <= totalPages
      )
      .sort(
        (a, b) => a - b
      );
  }, [
    pagination.totalPages,
    pagination.page,
    page,
  ]);

  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading &&
    residents.length === 0
  ) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading residents
            registry...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="dashboard-page residents-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header residents-page-header">

        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / Residents
          </div>

          <h1>
            Residents Registry
          </h1>

          <p>
            Search, view, edit and manage
            registered members of Ta-hoss
            Community.
          </p>
        </div>

        <div className="header-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing ||
              loading
            }
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/residents/register"
              )
            }
          >
            + Register Resident
          </button>

        </div>

      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="dashboard-stats">

        <div className="stat-card">
          <span>
            Registered Residents
          </span>

          <strong>
            {pagination.total ??
              0}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Current Page
          </span>

          <strong>
            {pagination.page ||
              page}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Total Pages
          </span>

          <strong>
            {pagination.totalPages ||
              1}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Community
          </span>

          <strong>
            Ta-hoss
          </strong>
        </div>

      </div>

      {/* =====================================================
          SEARCH + EXPORT
      ====================================================== */}

      <section className="dashboard-panel resident-tools-panel">

        <div className="panel-header resident-tools-header">

          <div>
            <h2>
              Resident Records
            </h2>

            <p>
              Search the registry or export
              resident records for official
              reporting and documentation.
            </p>
          </div>

          <div className="resident-export-actions">

            <button
              type="button"
              className="export-button export-excel"
              onClick={
                handleExportExcel
              }
              disabled={
                Boolean(exporting)
              }
              title="Export residents to Excel"
            >
              {exporting ===
              "excel" ? (
                <>
                  <span className="button-spinner" />
                  Exporting...
                </>
              ) : (
                <>
                  <span className="export-icon">
                    XLS
                  </span>
                  Excel
                </>
              )}
            </button>

            <button
              type="button"
              className="export-button export-pdf"
              onClick={
                handleExportPDF
              }
              disabled={
                Boolean(exporting)
              }
              title="Export residents to PDF"
            >
              {exporting ===
              "pdf" ? (
                <>
                  <span className="button-spinner" />
                  Exporting...
                </>
              ) : (
                <>
                  <span className="export-icon">
                    PDF
                  </span>
                  PDF
                </>
              )}
            </button>

          </div>

        </div>

        <form
          className="resident-search-form"
          onSubmit={
            handleSearch
          }
        >

          <div className="resident-search-input">

            <span
              className="search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              type="text"
              value={
                searchInput
              }
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              placeholder="Search Resident ID, name or phone number..."
              aria-label="Search residents"
            />

            {searchInput && (
              <button
                type="button"
                className="search-clear-button"
                onClick={() =>
                  setSearchInput(
                    ""
                  )
                }
                aria-label="Clear search input"
              >
                ×
              </button>
            )}

          </div>

          <button
            type="submit"
            className="primary-button search-submit-button"
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              className="secondary-button search-clear-action"
              onClick={
                clearSearch
              }
            >
              Clear Search
            </button>
          )}

        </form>

        {search && (
          <div className="search-result-info">
            <span>
              Search results for
            </span>

            <strong>
              "{search}"
            </strong>

            <span>
              • {pagination.total || 0}{" "}
              matching resident
              {pagination.total ===
              1
                ? ""
                : "s"}
            </span>
          </div>
        )}

      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="dashboard-error resident-page-error">

          <div>
            <strong>
              Something went wrong
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadResidents
            }
          >
            Try Again
          </button>

        </div>
      )}

      {/* =====================================================
          REGISTRY
      ====================================================== */}

      <section className="dashboard-panel resident-registry-panel">

        <div className="panel-header">

          <div>
            <h2>
              Registered Residents
            </h2>

            <p>
              Official resident records
              currently registered in
              TA-HOSS LOG.
            </p>
          </div>

          <span className="panel-count">
            {pagination.total ||
              0}{" "}
            resident
            {pagination.total ===
            1
              ? ""
              : "s"}
          </span>

        </div>

        {residents.length > 0 ? (
          <>

            {/* =================================================
                DESKTOP TABLE
            ================================================== */}

            <div className="residents-table-wrapper">

              <table className="residents-table">

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
                      Demographics
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
                      Status
                    </th>

                    <th className="action-column">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {residents.map(
                    (
                      resident
                    ) => {

                      const residentObjectId =
                        getResidentId(
                          resident
                        );

                      const householdId =
                        getHouseholdId(
                          resident
                        );

                      const name =
                        formatName(
                          resident
                        ) ||
                        "Unknown Resident";

                      const photoUrl =
                        getPhotoUrl(
                          resident
                        );

                      return (
                        <tr
                          key={
                            residentObjectId ||
                            resident.residentId
                          }
                        >

                          {/* RESIDENT */}

                          <td>

                            <Link
                              to={`/resident/${residentObjectId}`}
                              className="resident-table-person"
                            >

                              <div className="resident-table-avatar">

                                {photoUrl ? (
                                  <img
                                    src={
                                      photoUrl
                                    }
                                    alt={
                                      name
                                    }
                                    loading="lazy"
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.style.display =
                                        "none";

                                      event.currentTarget.parentElement?.classList.add(
                                        "avatar-image-error"
                                      );
                                    }}
                                  />
                                ) : (
                                  <span>
                                    {getInitials(
                                      resident
                                    )}
                                  </span>
                                )}

                              </div>

                              <div className="resident-person-details">

                                <strong>
                                  {name}
                                </strong>

                                <span>
                                  {resident.phoneNumber ||
                                    "No phone number"}
                                </span>

                              </div>

                            </Link>

                          </td>

                          {/* RESIDENT ID */}

                          <td>
                            <span className="resident-id">
                              {resident.residentId ||
                                "N/A"}
                            </span>
                          </td>

                          {/* HOUSEHOLD */}

                          <td>

                            {householdId ? (
                              <Link
                                to={`/households/${householdId}`}
                                className="table-link household-link"
                              >
                                <span>
                                  {getHouseholdDisplayId(
                                    resident
                                  )}
                                </span>
                              </Link>
                            ) : (
                              <span className="muted-text">
                                Not assigned
                              </span>
                            )}

                          </td>

                          {/* DEMOGRAPHICS */}

                          <td>

                            <div className="resident-demographics">

                              <span>
                                {formatLabel(
                                  resident.gender
                                )}
                              </span>

                              <small>
                                DOB:{" "}
                                {formatDate(
                                  resident.dateOfBirth
                                )}
                              </small>

                            </div>

                          </td>

                          {/* RELATIONSHIP */}

                          <td>
                            <span className="relationship-text">
                              {formatLabel(
                                resident.relationshipToHead
                              )}
                            </span>
                          </td>

                          {/* VERIFICATION */}

                          <td>

                            <span
                              className={getVerificationClass(
                                resident.verificationStatus
                              )}
                            >
                              <span className="status-dot" />

                              {formatLabel(
                                resident.verificationStatus ||
                                  "pending"
                              )}
                            </span>

                          </td>

                          {/* IDENTITY */}

                          <td>

                            <span
                              className={getIdentityClass(
                                resident.identityStatus ||
                                  "pending"
                              )}
                            >
                              <span className="status-dot" />

                              {formatLabel(
                                resident.identityStatus ||
                                  "pending"
                              )}
                            </span>

                          </td>

                          {/* RECORD STATUS */}

                          <td>

                            <span
                              className={getResidentStatusClass(
                                resident.status ||
                                  "active"
                              )}
                            >
                              <span className="status-dot" />

                              {formatLabel(
                                resident.status ||
                                  "active"
                              )}
                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="resident-action-cell">

                            <div className="resident-row-actions">

                              <Link
                                to={`/resident/${residentObjectId}`}
                                className="table-action-button view-action"
                                title="View resident"
                              >
                                View
                              </Link>

                              <Link
                                to={`/resident/${residentObjectId}/edit`}
                                className="table-action-button edit-action"
                                title="Edit resident record"
                              >
                                Edit
                              </Link>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* =================================================
                MOBILE RESIDENT LIST
            ================================================== */}

            <div className="residents-mobile-list">

              {residents.map(
                (resident) => {

                  const residentObjectId =
                    getResidentId(
                      resident
                    );

                  const name =
                    formatName(
                      resident
                    ) ||
                    "Unknown Resident";

                  const photoUrl =
                    getPhotoUrl(
                      resident
                    );

                  return (
                    <article
                      className="resident-mobile-card"
                      key={
                        `mobile-${residentObjectId}`
                      }
                    >

                      <div className="resident-mobile-main">

                        <div className="resident-table-avatar mobile-avatar">

                          {photoUrl ? (
                            <img
                              src={
                                photoUrl
                              }
                              alt={
                                name
                              }
                              loading="lazy"
                            />
                          ) : (
                            <span>
                              {getInitials(
                                resident
                              )}
                            </span>
                          )}

                        </div>

                        <div className="resident-mobile-identity">

                          <strong>
                            {name}
                          </strong>

                          <span>
                            {resident.residentId ||
                              "No Resident ID"}
                          </span>

                          <small>
                            {resident.phoneNumber ||
                              "No phone number"}
                          </small>

                        </div>

                      </div>

                      <div className="resident-mobile-details">

                        <div>
                          <span>
                            Household
                          </span>

                          <strong>
                            {getHouseholdDisplayId(
                              resident
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Gender
                          </span>

                          <strong>
                            {formatLabel(
                              resident.gender
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            DOB
                          </span>

                          <strong>
                            {formatDate(
                              resident.dateOfBirth
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Relationship
                          </span>

                          <strong>
                            {formatLabel(
                              resident.relationshipToHead
                            )}
                          </strong>
                        </div>

                      </div>

                      <div className="resident-mobile-statuses">

                        <span
                          className={getVerificationClass(
                            resident.verificationStatus
                          )}
                        >
                          <span className="status-dot" />

                          {formatLabel(
                            resident.verificationStatus ||
                              "pending"
                          )}
                        </span>

                        <span
                          className={getIdentityClass(
                            resident.identityStatus ||
                              "pending"
                          )}
                        >
                          <span className="status-dot" />

                          Identity:{" "}
                          {formatLabel(
                            resident.identityStatus ||
                              "pending"
                          )}
                        </span>

                      </div>

                      <div className="resident-mobile-actions">

                        <Link
                          to={`/resident/${residentObjectId}`}
                          className="table-action-button view-action"
                        >
                          View Record
                        </Link>

                        <Link
                          to={`/resident/${residentObjectId}/edit`}
                          className="table-action-button edit-action"
                        >
                          Edit Record
                        </Link>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </>
        ) : (

          <div className="empty-state">

            <div className="empty-state-icon">
              👥
            </div>

            <strong>
              {search
                ? "No residents found"
                : "No residents registered"}
            </strong>

            <span>
              {search
                ? "No resident records match your search criteria."
                : "There are currently no registered residents in the system."}
            </span>

            {!search && (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  navigate(
                    "/residents/register"
                  )
                }
              >
                Register First Resident
              </button>
            )}

            {search && (
              <button
                type="button"
                className="secondary-button"
                onClick={
                  clearSearch
                }
              >
                Clear Search
              </button>
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {pagination.totalPages >
        1 && (

        <section className="dashboard-panel pagination-panel">

          <div className="pagination-info">
            Showing page{" "}
            <strong>
              {pagination.page}
            </strong>{" "}
            of{" "}
            <strong>
              {pagination.totalPages}
            </strong>

            <span>
              • {pagination.total || 0}{" "}
              total residents
            </span>
          </div>

          <div className="pagination-controls">

            <button
              type="button"
              className="secondary-button pagination-nav-button"
              disabled={
                pagination.page <=
                1
              }
              onClick={() =>
                goToPage(
                  pagination.page -
                    1
                )
              }
            >
              ← Previous
            </button>

            <div className="pagination-pages">

              {paginationPages.map(
                (
                  pageNumber,
                  index
                ) => {

                  const previous =
                    paginationPages[
                      index - 1
                    ];

                  const needsGap =
                    previous &&
                    pageNumber -
                      previous >
                      1;

                  return (
                    <span
                      key={
                        pageNumber
                      }
                      className="pagination-page-group"
                    >

                      {needsGap && (
                        <span className="pagination-ellipsis">
                          …
                        </span>
                      )}

                      <button
                        type="button"
                        className={
                          pageNumber ===
                          pagination.page
                            ? "pagination-page active"
                            : "pagination-page"
                        }
                        onClick={() =>
                          goToPage(
                            pageNumber
                          )
                        }
                        aria-current={
                          pageNumber ===
                          pagination.page
                            ? "page"
                            : undefined
                        }
                      >
                        {
                          pageNumber
                        }
                      </button>

                    </span>
                  );
                }
              )}

            </div>

            <button
              type="button"
              className="secondary-button pagination-nav-button"
              disabled={
                pagination.page >=
                pagination.totalPages
              }
              onClick={() =>
                goToPage(
                  pagination.page +
                    1
                )
              }
            >
              Next →
            </button>

          </div>

        </section>

      )}

      {/* =====================================================
          MANAGEMENT ACTIONS
      ====================================================== */}

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>
            <h2>
              Resident Management
            </h2>

            <p>
              Manage community members,
              verification and digital identity
              records.
            </p>
          </div>

        </div>

        <div className="household-action-grid resident-management-grid">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/residents/register"
              )
            }
          >
            <strong>
              👤 Register Resident
            </strong>

            <span>
              Add a new community member
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/verification"
              )
            }
          >
            <strong>
              ✓ Verification
            </strong>

            <span>
              Review resident verification
              records
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/identity"
              )
            }
          >
            <strong>
              🪪 Identity & QR
            </strong>

            <span>
              Manage digital identity and QR
              records
            </span>
          </button>

        </div>

      </section>

    </div>
  );
};

export default ResidentsPage;