import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./AnalyticsPage.css";

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [operationFilter, setOperationFilter] = useState("all");
  const [persistentOperations, setPersistentOperations] = useState([]);
  const [fieldOfficers, setFieldOfficers] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [operationSaving, setOperationSaving] = useState(false);
  const [operationMessage, setOperationMessage] = useState("");

  const loadPersistentOperations = useCallback(async () => {
    try {
      setOperationsLoading(true);
      const [operationsResponse, officersResponse] = await Promise.all([
        api.get("/field-operations"),
        api.get("/field-operations/officers"),
      ]);
      if (operationsResponse.data?.success) setPersistentOperations(operationsResponse.data.data || []);
      if (officersResponse.data?.success) setFieldOfficers(officersResponse.data.data || []);
    } catch (err) {
      console.error("FIELD OPERATIONS ERROR:", err);
      setOperationMessage(err.response?.data?.message || "Unable to load persistent field operations.");
    } finally {
      setOperationsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setError("");
      const params = { months: 12, period };
      if (period === "custom") {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      const response = await api.get("/analytics/overview", { params });
      if (response.data?.success) setAnalytics(response.data.data);
      else setError(response.data?.message || "Unable to load analytics.");
    } catch (err) {
      console.error("ANALYTICS ERROR:", err);
      setError(err.response?.data?.message || "Unable to load community analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    loadAnalytics();
    loadPersistentOperations();
  }, [loadAnalytics, loadPersistentOperations]);

  const formatLabel = (value) => {
    if (!value) return "Unknown";
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const maxValue = (items = []) => Math.max(...items.map((item) => Number(item.count || 0)), 1);
  const refresh = async () => { setRefreshing(true); await loadAnalytics(); };

  const genderTotal = useMemo(() =>
    (analytics?.demographics?.gender || []).reduce((sum, item) => sum + Number(item.count || 0), 0), [analytics]);

  const genderGradient = useMemo(() => {
    if (!genderTotal) return "#edf2f7";
    let cursor = 0;
    const parts = (analytics?.demographics?.gender || []).map((item) => {
      const start = (cursor / genderTotal) * 360;
      cursor += Number(item.count || 0);
      const end = (cursor / genderTotal) * 360;
      const label = String(item.label).toLowerCase();
      const color = label === "female" ? "#e08a9a" : label === "male" ? "#4e7aa5" : "#9aa5b1";
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [analytics, genderTotal]);

  const exportCSV = () => {
    if (!analytics) return;
    const rows = [
      ["TA-HOSS LOG Analytics Report"],
      ["Community", analytics.community],
      ["Period", PERIODS.find((item) => item.value === period)?.label || period],
      [],
      ["Metric", "Value"],
      ["Total Residents", analytics.overview.totalResidents],
      ["Total Households", analytics.overview.totalHouseholds],
      ["Verified Residents", analytics.overview.verifiedResidents],
      ["Pending Verification", analytics.overview.pendingResidents],
      ["Rejected Records", analytics.overview.rejectedResidents],
      ["Active Identities", analytics.overview.activeIdentities],
      ["GPS Coverage (%)", analytics.overview.gpsCoverage],
      ["Verification Rate (%)", analytics.overview.verificationRate],
      ["Average Household Size", analytics.overview.householdAverage],
      ["Data Completeness (%)", analytics.overview.dataCompleteness],
      ["Mapped Households", analytics.geographic?.mappedHouseholds ?? 0],
      ["Unmapped Households", analytics.geographic?.unmappedHouseholds ?? 0],
      ["Household GPS Coverage (%)", analytics.geographic?.householdGpsCoverage ?? 0],
      ["Average GPS Accuracy (m)", analytics.geographic?.averageGpsAccuracy ?? "N/A"],
      ["Unmapped Households (field target)", analytics.spatialOperations?.unmappedHouseholds ?? 0],
      ["Mapped Residents Awaiting Verification", analytics.spatialOperations?.mappedVerificationGap ?? 0],
      ["Spatial Operations Target", analytics.spatialOperations?.recommendedTarget ?? 0],
      [],
      ["Gender", "Count"],
      ...(analytics.demographics.gender || []).map((item) => [formatLabel(item.label), item.count]),
      [],
      ["Age Group", "Count"],
      ...(analytics.demographics.age || []).map((item) => [item.label, item.count]),
      [],
      ["Occupation", "Count"],
      ...(analytics.demographics.occupation || []).map((item) => [formatLabel(item.label), item.count]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `TA-HOSS-Analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  if (loading) return <div className="dashboard-page analytics-page"><div className="dashboard-loading"><div className="loading-spinner" /><p>Loading community analytics...</p></div></div>;
  if (error && !analytics) return <div className="dashboard-page analytics-page"><div className="dashboard-error">{error}</div><button className="back-button" onClick={loadAnalytics}>Try Again</button></div>;

  const overview = analytics?.overview || {};
  const demographics = analytics?.demographics || {};
  const highlights = analytics?.highlights || {};

  return (
    <div className="dashboard-page analytics-page">
      <div className="dashboard-header analytics-header">
        <div>
          <div className="breadcrumb">TA-HOSS LOG / Analytics</div>
          <h1>Community Analytics</h1>
          <p>Demographic, registration, verification and household intelligence for Ta-hoss Community.</p>
        </div>
        <div className="analytics-header-actions no-print">
          <button className="dashboard-button secondary" onClick={exportCSV}>↓ Export CSV</button>
          <button className="dashboard-button secondary" onClick={printReport}>Print / PDF</button>
          <button className="dashboard-button primary" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing..." : "↻ Refresh"}</button>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="analytics-filter-card no-print">
        <div className="analytics-filter-heading"><strong>Analytics Period</strong><span>Choose the population period used for the calculations.</span></div>
        <div className="analytics-periods">
          {PERIODS.map((item) => <button key={item.value} className={period === item.value ? "active" : ""} onClick={() => setPeriod(item.value)}>{item.label}</button>)}
        </div>
        {period === "custom" && <div className="analytics-custom-range"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className="dashboard-button primary" onClick={loadAnalytics}>Apply Range</button></div>}
      </section>

      <div className="analytics-range-note">Showing <strong>{PERIODS.find((item) => item.value === period)?.label}</strong>{analytics?.range?.from && <> · {analytics.range.from} to {analytics.range.to}</>}</div>

      <div className="analytics-stat-grid">
        <Stat label="Total Residents" value={overview.totalResidents} note="Registered active residents" />
        <Stat label="Total Households" value={overview.totalHouseholds} note="Active registered households" />
        <Stat label="Verified Residents" value={overview.verifiedResidents} note={`${overview.verificationRate ?? 0}% verification rate`} className="success" />
        <Stat label="Pending Verification" value={overview.pendingResidents} note="Records awaiting verification" className="warning" />
        <Stat label="GPS Coverage" value={`${overview.gpsCoverage ?? 0}%`} note={`${overview.mappedResidents ?? 0} residents mapped`} />
        <Stat label="Active Identities" value={overview.activeIdentities} note="Active TA-HOSS identities" />
      </div>

      <section className="analytics-insight-strip">
        <div><span>Largest age group</span><strong>{highlights.largestAgeGroup || "N/A"}</strong></div>
        <div><span>Top occupation</span><strong>{formatLabel(highlights.topOccupation)}</strong></div>
        <div><span>Average household</span><strong>{overview.householdAverage ?? 0} residents</strong></div>
        <div><span>Data completeness</span><strong>{overview.dataCompleteness ?? 0}%</strong></div>
      </section>

      <section className="analytics-intelligence-heading geographic-heading">
        <div>
          <span>GEOGRAPHIC INTELLIGENCE</span>
          <h2>Community Geographic Coverage &amp; Spatial Intelligence</h2>
          <p>Current GPS coverage of active households, location quality, mapped population and approximate concentration zones.</p>
        </div>
      </section>

      <div className="geographic-stat-grid">
        <GeoStat label="Mapped households" value={analytics?.geographic?.mappedHouseholds ?? 0} note={`${analytics?.geographic?.householdGpsCoverage ?? 0}% household GPS coverage`} />
        <GeoStat label="Unmapped households" value={analytics?.geographic?.unmappedHouseholds ?? 0} note="Active households without household coordinates" className="warning" />
        <GeoStat label="Mapped residents" value={analytics?.geographic?.mappedResidents ?? 0} note={`${analytics?.geographic?.residentGpsCoverage ?? 0}% resident GPS coverage`} />
        <GeoStat label="Average GPS accuracy" value={analytics?.geographic?.averageGpsAccuracy != null ? `±${analytics.geographic.averageGpsAccuracy}m` : "N/A"} note="Average recorded household GPS accuracy" />
      </div>

      <div className="geographic-main-grid">
        <section className="dashboard-panel analytics-panel geographic-map-panel">
          <div className="panel-header">
            <div><h2>Household GPS Footprint</h2><p>Mapped active households across the Ta-hoss Community footprint.</p></div>
            <span className="geo-map-badge">{analytics?.geographic?.mappedHouseholds ?? 0} mapped</span>
          </div>
          <GeographicMap geographic={analytics?.geographic} />
        </section>

        <section className="dashboard-panel analytics-panel geographic-side-panel">
          <div className="panel-header"><div><h2>GPS Quality Profile</h2><p>Distribution of mapped household coordinates by recorded accuracy.</p></div></div>
          <GeoAccuracyPanel bands={analytics?.geographic?.accuracyBands} />
          <div className="geo-summary-list">
            <div><span>Current household coverage</span><strong>{analytics?.geographic?.householdGpsCoverage ?? 0}%</strong></div>
            <div><span>Current resident coverage</span><strong>{analytics?.geographic?.residentGpsCoverage ?? 0}%</strong></div>
            <div><span>Mapped population</span><strong>{analytics?.geographic?.mappedResidents ?? 0}</strong></div>
          </div>
        </section>
      </div>

      <div className="geographic-secondary-grid">
        <ConcentrationPanel zones={analytics?.geographic?.concentrationZones} />
        <GeographicCoveragePanel geographic={analytics?.geographic} />
      </div>

      <section className="analytics-intelligence-heading spatial-heading">
        <div>
          <span>SPATIAL OPERATIONS INTELLIGENCE</span>
          <h2>Field Planning &amp; Geographic Work Queue</h2>
          <p>Turn the mapped community footprint into a practical field-work priority queue using household size, verification gaps and GPS quality.</p>
        </div>
      </section>

      <div className="spatial-stat-grid">
        <SpatialStat label="High-priority mapped households" value={analytics?.spatialOperations?.priorityCounts?.high ?? 0} note="Highest combined operational score" tone="danger" />
        <SpatialStat label="Medium-priority mapped households" value={analytics?.spatialOperations?.priorityCounts?.medium ?? 0} note="Needs planned field attention" tone="warning" />
        <SpatialStat label="Verification field gap" value={analytics?.spatialOperations?.mappedVerificationGap ?? 0} note="Mapped residents still awaiting verification" tone="info" />
        <SpatialStat label="Field targets" value={analytics?.spatialOperations?.recommendedTarget ?? 0} note="Unmapped households + mapped verification gaps" />
      </div>

      <div className="spatial-operations-grid">
        <SpatialQueuePanel queue={analytics?.spatialOperations?.queue} />
        <SpatialZonePanel zones={analytics?.spatialOperations?.zones} />
      </div>

      <div className="spatial-field-note">
        <div className="spatial-note-icon">⌖</div>
        <div>
          <strong>Recommended field sequence</strong>
          <span>First close unmapped-household gaps, then work the highest-priority mapped households with verification gaps or weak GPS accuracy. Scores are operational planning aids and should not be treated as household risk classifications.</span>
        </div>
      </div>

      <section className="analytics-intelligence-heading field-operations-heading">
        <div>
          <span>FIELD OPERATIONS MANAGEMENT</span>
          <h2>Field Operations Command Center</h2>
          <p>Convert spatial priorities into a structured field-work queue for mapping, verification, GPS recapture and household review.</p>
        </div>
      </section>

      <FieldOperationsPanel
        spatial={analytics?.spatialOperations}
        geographic={analytics?.geographic}
        filter={operationFilter}
        setFilter={setOperationFilter}
      />

      <PersistentFieldOperationsPanel
        operations={persistentOperations}
        officers={fieldOfficers}
        loading={operationsLoading}
        saving={operationSaving}
        message={operationMessage}
        setMessage={setOperationMessage}
        onRefresh={loadPersistentOperations}
        onCreate={async (payload) => {
          try {
            setOperationSaving(true);
            setOperationMessage("");
            const response = await api.post("/field-operations", payload);
            if (!response.data?.success) throw new Error(response.data?.message || "Unable to create operation.");
            setOperationMessage("Field operation created successfully.");
            await loadPersistentOperations();
          } catch (err) {
            setOperationMessage(err.response?.data?.message || err.message || "Unable to create field operation.");
          } finally {
            setOperationSaving(false);
          }
        }}
        onStatusChange={async (id, status, extra = {}) => {
          try {
            setOperationSaving(true);
            setOperationMessage("");
            const response = await api.patch(`/field-operations/${id}`, { status, ...extra });
            if (!response.data?.success) throw new Error(response.data?.message || "Unable to update operation.");
            setOperationMessage("Field operation updated.");
            await loadPersistentOperations();
          } catch (err) {
            setOperationMessage(err.response?.data?.message || err.message || "Unable to update field operation.");
          } finally {
            setOperationSaving(false);
          }
        }}
      />

      <div className="analytics-grid analytics-grid-top">
        <TrendPanel title="Registration & Verification Trend" description="Monthly resident registrations and verified records for the selected period." registrations={analytics?.registrationTrend} verifications={analytics?.verificationTrend} />
        <section className="dashboard-panel analytics-panel gender-panel">
          <div className="panel-header"><div><h2>Gender Distribution</h2><p>Registered residents by gender.</p></div></div>
          <div className="gender-content"><div className="gender-donut" style={{ background: genderGradient }}><div><strong>{genderTotal}</strong><span>Residents</span></div></div><div className="legend-list">{(demographics.gender || []).map((item) => <div className="legend-row" key={item.label}><span className={`legend-dot ${item.label}`} /><span>{formatLabel(item.label)}</span><strong>{item.count}</strong></div>)}</div></div>
        </section>
      </div>

      <div className="analytics-grid analytics-grid-two">
        <BarPanel title="Age Distribution" description="Residents grouped by age." items={demographics.age} max={maxValue(demographics.age)} />
        <BarPanel title="Marital Status" description="Registered residents by marital status." items={demographics.maritalStatus} max={maxValue(demographics.maritalStatus)} />
        <BarPanel title="Education Level" description="Recorded education levels." items={demographics.education} max={maxValue(demographics.education)} />
        <BarPanel title="Occupation" description="Most frequently recorded occupations." items={demographics.occupation} max={maxValue(demographics.occupation)} />
      </div>

      <div className="analytics-grid analytics-grid-bottom">
        <BarPanel title="Household Size" description="Households grouped by number of registered residents." items={analytics?.householdSizes} max={maxValue(analytics?.householdSizes)} suffix=" households" />
        <BarPanel title="Relationship to Household Head" description="Resident relationship distribution." items={demographics.relationship} max={maxValue(demographics.relationship)} />
        <BarPanel title="Identity Status" description="Current TA-HOSS identity status." items={analytics?.identityStatus} max={maxValue(analytics?.identityStatus)} />
      </div>

      <section className="analytics-intelligence-heading">
        <div>
          <span>ANALYTICS INTELLIGENCE</span>
          <h2>Community Data Quality &amp; Operational Intelligence</h2>
          <p>Use these indicators to identify data gaps, population patterns and records that may require administrative attention.</p>
        </div>
      </section>

      <div className="analytics-grid analytics-intelligence-grid">
        <QualityPanel quality={analytics?.dataQuality} />
        <WatchlistPanel overview={overview} highlights={highlights} quality={analytics?.dataQuality} />
      </div>

      <div className="analytics-grid analytics-cross-grid">
        <AgeGenderPanel items={analytics?.ageByGender} />
        <VerificationGenderPanel items={analytics?.verificationByGender} />
      </div>

      <section className="dashboard-panel analytics-panel analytics-footer-panel">
        <div className="panel-header"><div><h2>Analytics Summary</h2><p>System-generated community data overview.</p></div><span className="analytics-generated">Updated {analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleString("en-GB") : "now"}</span></div>
        <div className="analytics-summary-grid"><div><span>Community</span><strong>{analytics?.community || "Ta-hoss Community"}</strong></div><div><span>Verification Progress</span><strong>{overview.verificationRate ?? 0}%</strong></div><div><span>GPS Coverage</span><strong>{overview.gpsCoverage ?? 0}%</strong></div><div><span>Data Status</span><strong>{overview.totalResidents ? "Live database" : "No resident data"}</strong></div></div>
      </section>
    </div>
  );
};

const Stat = ({ label, value, note, className = "" }) => <div className={`analytics-stat-card ${className}`}><span>{label}</span><strong>{value ?? 0}</strong><small>{note}</small></div>;

const TrendPanel = ({ title, description, registrations = [], verifications = [] }) => {
  const max = Math.max(...registrations.map((item) => Number(item.count || 0)), ...verifications.map((item) => Number(item.count || 0)), 1);
  return <section className="dashboard-panel analytics-panel"><div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div></div><div className="trend-chart trend-dual">{registrations.map((item, index) => <div className="trend-column" key={item.key}><span className="trend-value">{item.count}</span><div className="trend-track"><div className="trend-bar" style={{ height: `${Math.max((item.count / max) * 100, item.count ? 5 : 1)}%` }} /><div className="trend-verify-bar" style={{ height: `${Math.max(((verifications[index]?.count || 0) / max) * 100, verifications[index]?.count ? 5 : 1)}%` }} /></div><span className="trend-label">{item.label}</span></div>)}</div><div className="trend-legend"><span><i className="legend-square registrations" /> Registrations</span><span><i className="legend-square verifications" /> Verified</span></div></section>;
};

const BarPanel = ({ title, description, items = [], max = 1, suffix = "" }) => <section className="dashboard-panel analytics-panel"><div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div></div><div className="analytics-bars">{items.length ? items.map((item) => <div className="analytics-bar-row" key={item.label}><div className="analytics-bar-meta"><span title={formatStaticLabel(item.label)}>{formatStaticLabel(item.label)}</span><strong>{item.count}{suffix}</strong></div><div className="analytics-bar-track"><div className="analytics-bar-fill" style={{ width: `${Math.max((Number(item.count || 0) / max) * 100, item.count ? 3 : 0)}%` }} /></div></div>) : <div className="analytics-empty">No data available yet.</div>}</div></section>;

const formatStaticLabel = (value) => !value ? "Unknown" : String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const QualityPanel = ({ quality }) => {
  const fields = quality?.fields || [];
  return (
    <section className="dashboard-panel analytics-panel intelligence-panel">
      <div className="panel-header">
        <div><h2>Data Quality Profile</h2><p>Completeness of key resident information currently recorded.</p></div>
        <strong className="quality-score">{quality?.overall ?? 0}%</strong>
      </div>
      <div className="quality-list">
        {fields.length ? fields.map((item) => (
          <div className="quality-row" key={item.key}>
            <div className="quality-meta"><span>{item.label}</span><strong>{item.rate}%</strong></div>
            <div className="quality-track"><div className={`quality-fill ${item.rate < 70 ? "low" : item.rate < 90 ? "medium" : "high"}`} style={{ width: `${Math.max(0, Math.min(100, item.rate))}%` }} /></div>
            <small>{item.missing} record{item.missing === 1 ? "" : "s"} missing</small>
          </div>
        )) : <div className="analytics-empty">No quality indicators available.</div>}
      </div>
    </section>
  );
};

const WatchlistPanel = ({ overview, highlights, quality }) => {
  const gpsMissing = Math.max(Number(overview.totalResidents || 0) - Number(overview.mappedResidents || 0), 0);
  const alerts = [
    { label: "Pending verification", value: overview.pendingResidents || 0, tone: "warning", note: "Residents awaiting review" },
    { label: "Rejected records", value: overview.rejectedResidents || 0, tone: "danger", note: "Records requiring correction" },
    { label: "Residents without GPS", value: gpsMissing, tone: "neutral", note: "Not yet geographically mapped" },
    { label: "Unknown occupation", value: quality?.fields?.find((item) => item.key === "occupation")?.missing || 0, tone: "neutral", note: "Occupation not recorded" },
  ];
  return (
    <section className="dashboard-panel analytics-panel intelligence-panel">
      <div className="panel-header"><div><h2>Operational Watchlist</h2><p>Simple indicators for records that may need follow-up.</p></div></div>
      <div className="watchlist">
        {alerts.map((item) => <div className="watch-row" key={item.label}><div className={`watch-icon ${item.tone}`}>!</div><div className="watch-copy"><strong>{item.label}</strong><span>{item.note}</span></div><b>{item.value}</b></div>)}
      </div>
      <div className="watch-highlight"><span>Leading population signal</span><strong>{highlights.largestAgeGroup || "N/A"}</strong><small>Largest recorded age group in the selected population.</small></div>
    </section>
  );
};

const AgeGenderPanel = ({ items = [] }) => {
  const ageGroups = ["0–14", "15–24", "25–34", "35–44", "45–54", "55–64", "65+"];
  const genders = [...new Set(items.map((item) => item.gender))].sort();
  const lookup = (age, gender) => items.find((item) => item.ageGroup === age && item.gender === gender)?.count || 0;
  const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);
  return (
    <section className="dashboard-panel analytics-panel intelligence-panel">
      <div className="panel-header"><div><h2>Age × Gender Profile</h2><p>Population composition across age groups and gender.</p></div></div>
      <div className="matrix-wrapper">
        {items.length ? <table className="analytics-matrix"><thead><tr><th>Age group</th>{genders.map((gender) => <th key={gender}>{formatStaticLabel(gender)}</th>)}</tr></thead><tbody>{ageGroups.map((age) => <tr key={age}><td>{age}</td>{genders.map((gender) => { const value = lookup(age, gender); return <td key={gender}><span style={{ opacity: value ? 0.45 + (value / max) * 0.55 : 0.25 }}>{value}</span></td>; })}</tr>)}</tbody></table> : <div className="analytics-empty">Not enough age or gender data to build this profile.</div>}
      </div>
    </section>
  );
};

const VerificationGenderPanel = ({ items = [] }) => {
  const genders = [...new Set(items.map((item) => item.gender))].sort();
  const statuses = [...new Set(items.map((item) => item.status))].sort();
  const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);
  const lookup = (gender, status) => items.find((item) => item.gender === gender && item.status === status)?.count || 0;
  return (
    <section className="dashboard-panel analytics-panel intelligence-panel">
      <div className="panel-header"><div><h2>Verification Profile</h2><p>Verification status distributed across gender categories.</p></div></div>
      <div className="verification-profile">
        {genders.length ? genders.map((gender) => <div className="verification-group" key={gender}><div className="verification-group-title"><strong>{formatStaticLabel(gender)}</strong><span>{statuses.reduce((sum, status) => sum + lookup(gender, status), 0)} residents</span></div>{statuses.map((status) => { const value = lookup(gender, status); return <div className="verification-row" key={status}><span>{formatStaticLabel(status)}</span><div className="verification-track"><div className={`verification-fill ${status}`} style={{ width: `${Math.max(value ? 3 : 0, (value / max) * 100)}%` }} /></div><strong>{value}</strong></div>; })}</div>) : <div className="analytics-empty">No verification profile data available.</div>}
      </div>
    </section>
  );
};

const SpatialStat = ({ label, value, note, tone = "default" }) => (
  <div className={`spatial-stat-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);

const SpatialQueuePanel = ({ queue = [] }) => (
  <section className="dashboard-panel analytics-panel spatial-queue-panel">
    <div className="panel-header">
      <div><h2>Priority Field Queue</h2><p>Highest-priority mapped households for the next field operation.</p></div>
      <span className="spatial-panel-badge">Top {Math.min(queue.length, 12)}</span>
    </div>
    {queue.length ? (
      <div className="spatial-queue-list">
        {queue.map((item, index) => (
          <div className="spatial-queue-row" key={item.id}>
            <span className={`spatial-rank ${item.priority}`}>{index + 1}</span>
            <div className="spatial-queue-main">
              <strong>{item.householdId || "Household"}</strong>
              <span>{item.compound} · {item.houseNumber}</span>
            </div>
            <div className="spatial-queue-meta">
              <b>{item.priorityScore}</b>
              <small>score</small>
            </div>
            <div className="spatial-queue-gap">
              <b>{item.unverifiedResidents}</b>
              <small>unverified</small>
            </div>
            <span className={`spatial-priority-badge ${item.priority}`}>{formatStaticLabel(item.priority)}</span>
          </div>
        ))}
      </div>
    ) : <div className="analytics-empty">No mapped households are currently available for field prioritisation.</div>}
  </section>
);

const SpatialZonePanel = ({ zones = [] }) => (
  <section className="dashboard-panel analytics-panel spatial-zone-panel">
    <div className="panel-header">
      <div><h2>Operational Zones</h2><p>Concentration zones ranked by average operational priority.</p></div>
    </div>
    {zones.length ? (
      <div className="spatial-zone-list">
        {zones.slice(0, 8).map((zone) => (
          <div className="spatial-zone-row" key={zone.key}>
            <span className={`spatial-zone-rank ${zone.priority}`}>{zone.rank}</span>
            <div className="spatial-zone-copy">
              <strong>Zone {zone.rank}</strong>
              <span>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
            </div>
            <div><b>{zone.households}</b><small>households</small></div>
            <div><b>{zone.unverifiedResidents}</b><small>unverified</small></div>
            <span className={`spatial-priority-badge ${zone.priority}`}>{formatStaticLabel(zone.priority)}</span>
          </div>
        ))}
      </div>
    ) : <div className="analytics-empty">No operational zones are available yet.</div>}
  </section>
);

const PersistentFieldOperationsPanel = ({ operations = [], officers = [], loading, saving, message, setMessage, onRefresh, onCreate, onStatusChange }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ type: "household_review", title: "", priority: "medium", assignedOfficer: "", scheduledDate: "", targetLabel: "", notes: "" });

  const counts = useMemo(() => operations.reduce((acc, item) => {
    acc.total += 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    if (["high", "critical"].includes(item.priority) && !["completed", "cancelled"].includes(item.status)) acc.high += 1;
    return acc;
  }, { total: 0, planned: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0, high: 0 }), [operations]);

  const submit = async (event) => {
    event.preventDefault();
    await onCreate({ ...form, assignedOfficer: form.assignedOfficer || null, scheduledDate: form.scheduledDate || null, source: "manual" });
    setForm({ type: "household_review", title: "", priority: "medium", assignedOfficer: "", scheduledDate: "", targetLabel: "", notes: "" });
    setFormOpen(false);
  };

  const labelType = (value) => ({ gps_mapping: "GPS Mapping", resident_verification: "Resident Verification", gps_recapture: "GPS Recapture", household_review: "Household Review", follow_up: "Follow-up" }[value] || formatStaticLabel(value));
  const labelStatus = (value) => ({ planned: "Planned", assigned: "Assigned", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled", overdue: "Overdue" }[value] || formatStaticLabel(value));

  return (
    <section className="persistent-operations-shell">
      <div className="analytics-intelligence-heading persistent-operations-heading">
        <div><span>EXECUTION LAYER</span><h2>Persistent Field Operations &amp; Assignment Management</h2><p>Turn field recommendations into real assignments with officers, schedules, status tracking and an operational audit trail.</p></div>
        <div className="persistent-heading-actions no-print"><button className="dashboard-button secondary" onClick={onRefresh} disabled={loading || saving}>↻ Refresh</button><button className="dashboard-button primary" onClick={() => setFormOpen((value) => !value)}>{formOpen ? "Close Form" : "+ New Operation"}</button></div>
      </div>

      {message && <div className="persistent-operation-message">{message}</div>}

      <div className="persistent-operation-stat-grid">
        <div className="persistent-operation-stat"><span>TOTAL OPERATIONS</span><strong>{counts.total}</strong><small>Persistent field records</small></div>
        <div className="persistent-operation-stat warning"><span>PLANNED / ASSIGNED</span><strong>{counts.planned + counts.assigned}</strong><small>Awaiting field execution</small></div>
        <div className="persistent-operation-stat info"><span>IN PROGRESS</span><strong>{counts.in_progress}</strong><small>Currently being executed</small></div>
        <div className="persistent-operation-stat success"><span>COMPLETED</span><strong>{counts.completed}</strong><small>Recorded completed visits</small></div>
        <div className="persistent-operation-stat danger"><span>HIGH PRIORITY OPEN</span><strong>{counts.high}</strong><small>High or critical unresolved work</small></div>
      </div>

      {formOpen && <form className="persistent-operation-form dashboard-panel" onSubmit={submit}>
        <div className="panel-header"><div><h2>Create Field Operation</h2><p>Create a persistent operational record instead of relying on an analytics recommendation.</p></div></div>
        <div className="persistent-form-grid">
          <label>Operation type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="gps_mapping">GPS Mapping</option><option value="resident_verification">Resident Verification</option><option value="gps_recapture">GPS Recapture</option><option value="household_review">Household Review</option><option value="follow_up">Follow-up</option></select></label>
          <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Verify Main Compound households" /></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
          <label>Assign field officer<select value={form.assignedOfficer} onChange={(e) => setForm({ ...form, assignedOfficer: e.target.value })}><option value="">Unassigned</option>{officers.map((officer) => <option key={officer._id} value={officer._id}>{officer.fullName || officer.name || officer.username} · {formatStaticLabel(officer.role)}</option>)}</select></label>
          <label>Scheduled date<input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></label>
          <label>Target label<input value={form.targetLabel} onChange={(e) => setForm({ ...form, targetLabel: e.target.value })} placeholder="Household, compound or field target" /></label>
          <label className="persistent-form-wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instructions or field notes" /></label>
        </div>
        <div className="persistent-form-actions"><button type="button" className="dashboard-button secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="dashboard-button primary" disabled={saving}>{saving ? "Saving..." : "Create Operation"}</button></div>
      </form>}

      <section className="dashboard-panel analytics-panel persistent-workboard">
        <div className="panel-header"><div><h2>Persistent Operations Workboard</h2><p>Every record below is stored in the database and can be assigned, started, completed or cancelled.</p></div><span className="persistent-live-badge">LIVE RECORDS</span></div>
        {loading ? <div className="analytics-empty persistent-loading"><div className="loading-spinner" /><span>Loading field operations...</span></div> : operations.length ? <div className="persistent-table-wrap"><div className="persistent-table">
          <div className="persistent-row persistent-head"><span>Operation</span><span>Target</span><span>Officer</span><span>Schedule</span><span>Status</span><span>Action</span></div>
          {operations.map((item) => <div className="persistent-row" key={item._id}>
            <div><strong>{item.title}</strong><small>{item.operationId} · {labelType(item.type)}</small></div>
            <div><strong>{item.targetLabel || item.household?.householdId || "Community target"}</strong><small>{[item.location?.compound, item.location?.houseNumber].filter(Boolean).join(" / ") || "Location not specified"}</small></div>
            <div><strong>{item.assignedOfficer?.name || "Unassigned"}</strong><small>{item.assignedOfficer ? formatStaticLabel(item.assignedOfficer.role) : "Needs assignment"}</small></div>
            <div><strong>{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString("en-GB") : "—"}</strong><small>{item.priority.toUpperCase()} priority</small></div>
            <span className={`persistent-status ${item.status}`}>{labelStatus(item.status)}</span>
            <div className="persistent-actions">
              {item.status === "planned" && <button onClick={() => onStatusChange(item._id, "assigned")} disabled={!item.assignedOfficer || saving}>Assign</button>}
              {item.status === "assigned" && <button onClick={() => onStatusChange(item._id, "in_progress")} disabled={saving}>Start</button>}
              {item.status === "in_progress" && <button onClick={() => onStatusChange(item._id, "completed")} disabled={saving}>Complete</button>}
              {!(["completed", "cancelled"].includes(item.status)) && <button className="danger" onClick={() => onStatusChange(item._id, "cancelled")} disabled={saving}>Cancel</button>}
            </div>
          </div>)}
        </div></div> : <div className="persistent-empty"><div>⌖</div><strong>No persistent field operations yet</strong><span>Create the first operation or convert a spatial recommendation into a persistent assignment.</span></div>}
      </section>

      <div className="persistent-lifecycle">
        <span>PLANNED</span><i>→</i><span>ASSIGNED</span><i>→</i><span>IN PROGRESS</span><i>→</i><b>COMPLETED</b><em>or CANCELLED</em>
      </div>
    </section>
  );
};

const FieldOperationsPanel = ({ spatial = {}, geographic = {}, filter, setFilter }) => {
  const queue = spatial?.queue || [];
  const unmapped = Number(spatial?.unmappedHouseholds || geographic?.unmappedHouseholds || 0);
  const verificationGap = Number(spatial?.mappedVerificationGap || 0);
  const weakGps = queue.filter((item) => item.accuracy == null || Number(item.accuracy) > 15).length;
  const high = Number(spatial?.priorityCounts?.high || 0);
  const medium = Number(spatial?.priorityCounts?.medium || 0);
  const totalTargets = Number(spatial?.recommendedTarget || 0);

  const operations = [
    ...(unmapped > 0 ? [{
      id: "MAPPING-BACKLOG",
      type: "GPS Mapping",
      priority: "high",
      target: `${unmapped} unmapped households`,
      location: "Community-wide mapping backlog",
      residents: 0,
      outstanding: unmapped,
      score: 100,
      accuracy: null,
    }] : []),
    ...queue.map((item, index) => {
    const weak = item.accuracy == null || Number(item.accuracy) > 15;
    const type = item.unverifiedResidents > 0 ? "Resident Verification" : weak ? "GPS Recapture" : "Household Review";
    return {
      id: item.householdId || `OPS-${index + 1}`,
      type,
      priority: item.priority || "low",
      target: item.householdId || "Household",
      location: [item.compound, item.houseNumber].filter(Boolean).join(" / ") || "Community location",
      residents: Number(item.residentCount || 0),
      outstanding: Number(item.unverifiedResidents || 0),
      score: Number(item.priorityScore || 0),
      accuracy: item.accuracy,
    };
    }),
  ];

  const filtered = filter === "all" ? operations : operations.filter((item) => item.priority === filter);

  return (
    <section className="field-operations-shell">
      <div className="field-operations-stat-grid">
        <div className="field-operation-stat"><span>OPEN FIELD TARGETS</span><strong>{totalTargets}</strong><small>Unmapped households + mapped verification gaps</small></div>
        <div className="field-operation-stat danger"><span>HIGH PRIORITY</span><strong>{high}</strong><small>Households requiring earliest attention</small></div>
        <div className="field-operation-stat warning"><span>MEDIUM PRIORITY</span><strong>{medium}</strong><small>Planned field attention</small></div>
        <div className="field-operation-stat info"><span>GPS / VERIFICATION GAPS</span><strong>{unmapped + verificationGap}</strong><small>{unmapped} mapping · {verificationGap} verification</small></div>
      </div>

      <div className="field-operations-main-grid">
        <section className="dashboard-panel analytics-panel field-workboard">
          <div className="panel-header field-workboard-header">
            <div><h2>Operational Workboard</h2><p>Recommended work items generated from current spatial intelligence.</p></div>
            <div className="field-operation-filters no-print">
              {[
                ["all", "All"],
                ["high", "High"],
                ["medium", "Medium"],
                ["low", "Low"],
              ].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
            </div>
          </div>

          <div className="field-workboard-table-wrap">
            <div className="field-workboard-table">
              <div className="field-workboard-row field-workboard-head">
                <span>Operation</span><span>Target</span><span>Priority</span><span>Residents</span><span>Action</span>
              </div>
              {filtered.length ? filtered.slice(0, 15).map((item) => (
                <div className="field-workboard-row" key={item.id}>
                  <div className="field-operation-name"><strong>{item.type}</strong><small>{item.id} · Score {item.score}</small></div>
                  <div className="field-operation-target"><strong>{item.target}</strong><small>{item.location}</small></div>
                  <span className={`field-priority ${item.priority}`}>{item.priority}</span>
                  <div className="field-operation-number"><strong>{item.residents}</strong><small>{item.outstanding ? `${item.outstanding} unverified` : "registered"}</small></div>
                  <span className="field-action-label">Recommended</span>
                </div>
              )) : <div className="analytics-empty field-empty">No field operations match this priority filter.</div>}
            </div>
          </div>
        </section>

        <section className="dashboard-panel analytics-panel field-plan-panel">
          <div className="panel-header"><div><h2>Field Action Plan</h2><p>Recommended operational sequence.</p></div></div>
          <div className="field-plan-list">
            <div className="field-plan-step"><b>01</b><div><strong>Map outstanding households</strong><span>{unmapped} active households without coordinates</span></div><em>{unmapped ? "OPEN" : "CLEAR"}</em></div>
            <div className="field-plan-step"><b>02</b><div><strong>Verify mapped residents</strong><span>{verificationGap} mapped residents still awaiting verification</span></div><em>{verificationGap ? "OPEN" : "CLEAR"}</em></div>
            <div className="field-plan-step"><b>03</b><div><strong>Recapture weak GPS</strong><span>{weakGps} priority households have weak or missing accuracy data</span></div><em>{weakGps ? "REVIEW" : "CLEAR"}</em></div>
            <div className="field-plan-step"><b>04</b><div><strong>Review remaining households</strong><span>Close medium and low priority operational gaps</span></div><em>{operations.length ? "PLAN" : "CLEAR"}</em></div>
          </div>
          <div className="field-plan-footer"><span>Planning basis</span><strong>Spatial priority + GPS quality + verification gap</strong></div>
        </section>
      </div>

      <div className="field-operations-note">
        <div className="field-note-icon">✓</div>
        <div><strong>Operational status boundary</strong><span>These work items are generated recommendations from the current database. They are not marked as completed until a future field-assignment and execution workflow records an officer, visit date, completion status and field evidence.</span></div>
      </div>
    </section>
  );
};

const GeoStat = ({ label, value, note, className = "" }) => (
  <div className={`geographic-stat-card ${className}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);

const GeographicMap = ({ geographic }) => {
  const points = geographic?.points || [];
  const center = geographic?.center
    ? [Number(geographic.center.latitude), Number(geographic.center.longitude)]
    : null;

  if (!center || !points.length) {
    return <div className="geo-empty-map"><div>⌖</div><strong>No mapped household coordinates yet</strong><span>Capture household GPS coordinates to build the community geographic footprint.</span></div>;
  }

  return (
    <div className="geo-map-wrap">
      <MapContainer center={center} zoom={16} scrollWheelZoom className="geo-leaflet-map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={Math.max(6, Math.min(13, 6 + Number(point.residentCount || 0)))}
            pathOptions={{ color: "#102f4d", fillColor: "#176a83", fillOpacity: 0.78, weight: 2 }}
          >
            <Popup>
              <div className="geo-popup">
                <strong>{point.householdId || "Household"}</strong>
                <span>{point.compound} / {point.houseNumber}</span>
                <span>{point.residentCount} residents · {point.verifiedCount} verified</span>
                <span>Accuracy: {point.accuracy != null ? `±${point.accuracy}m` : "Not recorded"}</span>
                <span>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="geo-map-overlay"><span><i className="geo-dot" /> Household location</span><span>Marker size reflects resident count</span></div>
    </div>
  );
};

const GeoAccuracyPanel = ({ bands = [] }) => {
  const max = Math.max(...bands.map((item) => Number(item.count || 0)), 1);
  return (
    <div className="geo-accuracy-list">
      {bands.length ? bands.map((band) => (
        <div className="geo-accuracy-row" key={band.key}>
          <div><span>{band.label}</span><strong>{band.count}</strong></div>
          <div className="geo-accuracy-track"><div className={`geo-accuracy-fill ${band.key}`} style={{ width: `${Math.max(band.count ? 4 : 0, (band.count / max) * 100)}%` }} /></div>
        </div>
      )) : <div className="analytics-empty">No GPS quality data available.</div>}
    </div>
  );
};

const ConcentrationPanel = ({ zones = [] }) => (
  <section className="dashboard-panel analytics-panel geographic-concentration-panel">
    <div className="panel-header"><div><h2>Geographic Concentration</h2><p>Approximate analytical grid cells with the highest mapped household concentration.</p></div></div>
    {zones.length ? <div className="geo-zone-list">{zones.map((zone) => <div className="geo-zone-row" key={zone.key}><span className="geo-zone-rank">{zone.rank}</span><div><strong>Zone {zone.rank}</strong><small>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</small></div><b>{zone.households}<small> households</small></b><b>{zone.residents}<small> residents</small></b></div>)}</div> : <div className="analytics-empty">No concentration zones available yet.</div>}
  </section>
);

const GeographicCoveragePanel = ({ geographic }) => (
  <section className="dashboard-panel analytics-panel geographic-coverage-panel">
    <div className="panel-header"><div><h2>Coverage Intelligence</h2><p>Current geographic coverage indicators for operational planning.</p></div></div>
    <div className="geo-coverage-card"><span>Household GPS coverage</span><strong>{geographic?.householdGpsCoverage ?? 0}%</strong><div className="geo-progress"><i style={{ width: `${Math.min(100, geographic?.householdGpsCoverage ?? 0)}%` }} /></div><small>{geographic?.mappedHouseholds ?? 0} of {geographic?.activeHouseholds ?? 0} active households mapped</small></div>
    <div className="geo-coverage-card"><span>Resident GPS coverage</span><strong>{geographic?.residentGpsCoverage ?? 0}%</strong><div className="geo-progress"><i style={{ width: `${Math.min(100, geographic?.residentGpsCoverage ?? 0)}%` }} /></div><small>{geographic?.mappedResidents ?? 0} residents with GPS coordinates</small></div>
    <div className="geo-coverage-note"><strong>Planning signal</strong><span>{(geographic?.unmappedHouseholds ?? 0) > 0 ? `${geographic.unmappedHouseholds} active households still require geographic mapping.` : "All active households currently have geographic coordinates."}</span></div>
  </section>
);

export default AnalyticsPage;