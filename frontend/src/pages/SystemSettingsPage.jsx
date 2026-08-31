import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

import "./SystemSettingsPage.css";

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_SETTINGS = {
  community: {
    name: "",
    description: "",
    address: "",
    localGovernment: "",
    state: "",
    country: "",
    phoneNumber: "",
    email: "",
    logo: null,
    logoPublicId: null,
    gps: {
      latitude: "",
      longitude: "",
    },
  },

  system: {
    name: "",
    shortName: "",
    description: "",
    logo: null,
    logoPublicId: null,
    timezone: "Africa/Lagos",
    language: "en",
    dateFormat: "DD/MM/YYYY",
    defaultPageSize: 15,
    maintenanceMode: false,
    maintenanceMessage: "",
  },

  residentIdSettings: {
    enabled: true,
    prefix: "THR",
    separator: "-",
    numberLength: 6,
    nextNumber: 1,
  },

  householdIdSettings: {
    enabled: true,
    prefix: "THH",
    separator: "-",
    numberLength: 6,
    nextNumber: 1,
  },

  registration: {
    allowResidentRegistration: true,
    allowHouseholdRegistration: true,
    requireVerification: true,
    requirePhoto: false,
    requirePhoneNumber: false,
    requireGps: false,
    requireBiometric: false,
    defaultResidentStatus: "active",
    defaultVerificationStatus: "pending",
    defaultIdentityStatus: "pending",
  },

  security: {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    minimumPasswordLength: 8,
    requireUppercase: false,
    requireLowercase: true,
    requireNumber: false,
    requireSpecialCharacter: false,
  },

  notifications: {
    enabled: true,
    registrationNotifications: true,
    verificationNotifications: true,
    identityNotifications: true,
    systemNotifications: true,
  },

  dataManagement: {
    autoBackupEnabled: false,
    backupFrequency: "manual",
    auditLoggingEnabled: true,
    softDeleteEnabled: true,
  },

  identity: {
    enableQrIdentity: true,
    qrTokenExpiryDays: 365,
    allowIdentitySuspension: true,
    requireVerificationBeforeIdentityActivation: true,
  },
};

// =========================================================
// HELPERS
// =========================================================

const deepMergeSettings = (
  defaults,
  incoming
) => {
  return {
    ...defaults,

    ...incoming,

    community: {
      ...defaults.community,
      ...(incoming?.community || {}),
      gps: {
        ...defaults.community.gps,
        ...(incoming?.community?.gps || {}),
      },
    },

    system: {
      ...defaults.system,
      ...(incoming?.system || {}),
    },

    residentIdSettings: {
      ...defaults.residentIdSettings,
      ...(incoming?.residentIdSettings || {}),
    },

    householdIdSettings: {
      ...defaults.householdIdSettings,
      ...(incoming?.householdIdSettings || {}),
    },

    registration: {
      ...defaults.registration,
      ...(incoming?.registration || {}),
    },

    security: {
      ...defaults.security,
      ...(incoming?.security || {}),
    },

    notifications: {
      ...defaults.notifications,
      ...(incoming?.notifications || {}),
    },

    dataManagement: {
      ...defaults.dataManagement,
      ...(incoming?.dataManagement || {}),
    },

    identity: {
      ...defaults.identity,
      ...(incoming?.identity || {}),
    },
  };
};

const buildIdPreview = (
  settings
) => {
  if (!settings?.enabled) {
    return "ID generation disabled";
  }

  const prefix =
    settings.prefix || "";

  const separator =
    settings.separator ?? "";

  const numberLength =
    Number(
      settings.numberLength
    ) || 1;

  const nextNumber =
    Number(
      settings.nextNumber
    ) || 1;

  const number =
    String(nextNumber).padStart(
      numberLength,
      "0"
    );

  return `${prefix}${separator}${number}`;
};

// =========================================================
// COMPONENT
// =========================================================

const SystemSettingsPage = () => {
  // =======================================================
  // STATE
  // =======================================================

  const [
    settings,
    setSettings,
  ] = useState(
    DEFAULT_SETTINGS
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    resetting,
    setResetting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    activeSection,
    setActiveSection,
  ] = useState("community");

  // =======================================================
  // LOAD SETTINGS
  // =======================================================

  const loadSettings =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await api.get(
              "/system-settings"
            );

          if (
            response.data?.success
          ) {
            const mergedSettings =
              deepMergeSettings(
                DEFAULT_SETTINGS,
                response.data.data
              );

            setSettings(
              mergedSettings
            );
          } else {
            setError(
              response.data?.message ||
                "Unable to load system settings."
            );
          }
        } catch (err) {
          console.error(
            "SYSTEM SETTINGS LOAD ERROR:",
            err
          );

          setError(
            err.response?.data
              ?.message ||
              "Unable to load system settings."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // =======================================================
  // INPUT HANDLERS
  // =======================================================

  const updateSection = (
    section,
    field,
    value
  ) => {
    setSettings(
      (currentSettings) => ({
        ...currentSettings,

        [section]: {
          ...currentSettings[
            section
          ],

          [field]: value,
        },
      })
    );
  };

  const updateNestedSection = (
    section,
    nestedSection,
    field,
    value
  ) => {
    setSettings(
      (currentSettings) => ({
        ...currentSettings,

        [section]: {
          ...currentSettings[
            section
          ],

          [nestedSection]: {
            ...currentSettings[
              section
            ][nestedSection],

            [field]: value,
          },
        },
      })
    );
  };

  const handleTextChange = (
    section,
    field
  ) => (event) => {
    updateSection(
      section,
      field,
      event.target.value
    );
  };

  const handleNumberChange = (
    section,
    field
  ) => (event) => {
    const value =
      event.target.value;

    updateSection(
      section,
      field,
      value === ""
        ? ""
        : Number(value)
    );
  };

  const handleToggleChange = (
    section,
    field
  ) => (event) => {
    updateSection(
      section,
      field,
      event.target.checked
    );
  };

  // =======================================================
  // SAVE SETTINGS
  // =======================================================

  const handleSave =
    async (event) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const response =
          await api.put(
            "/system-settings",
            settings
          );

        if (
          response.data?.success
        ) {
          const mergedSettings =
            deepMergeSettings(
              DEFAULT_SETTINGS,
              response.data.data
            );

          setSettings(
            mergedSettings
          );

          setSuccess(
            response.data?.message ||
              "System settings saved successfully."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } else {
          setError(
            response.data?.message ||
              "Unable to save system settings."
          );
        }
      } catch (err) {
        console.error(
          "SYSTEM SETTINGS SAVE ERROR:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Unable to save system settings."
        );
      } finally {
        setSaving(false);
      }
    };

  // =======================================================
  // RESET SETTINGS
  // =======================================================

  const handleReset =
    async () => {
      const confirmed =
        window.confirm(
          "Are you sure you want to reset all system settings to their default values? This action will overwrite your current settings."
        );

      if (!confirmed) {
        return;
      }

      try {
        setResetting(true);
        setError("");
        setSuccess("");

        const response =
          await api.post(
            "/system-settings/reset"
          );

        if (
          response.data?.success
        ) {
          const mergedSettings =
            deepMergeSettings(
              DEFAULT_SETTINGS,
              response.data.data
            );

          setSettings(
            mergedSettings
          );

          setSuccess(
            response.data?.message ||
              "System settings have been reset successfully."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } else {
          setError(
            response.data?.message ||
              "Unable to reset system settings."
          );
        }
      } catch (err) {
        console.error(
          "SYSTEM SETTINGS RESET ERROR:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Unable to reset system settings."
        );
      } finally {
        setResetting(false);
      }
    };

  // =======================================================
  // ID PREVIEWS
  // =======================================================

  const residentIdPreview =
    useMemo(
      () =>
        buildIdPreview(
          settings.residentIdSettings
        ),
      [
        settings.residentIdSettings,
      ]
    );

  const householdIdPreview =
    useMemo(
      () =>
        buildIdPreview(
          settings.householdIdSettings
        ),
      [
        settings.householdIdSettings,
      ]
    );

  // =======================================================
  // NAVIGATION
  // =======================================================

  const sections = [
    {
      id: "community",
      label: "Community",
      icon: "🏘️",
    },
    {
      id: "system",
      label: "System",
      icon: "⚙️",
    },
    {
      id: "resident-id",
      label: "Resident ID",
      icon: "👤",
    },
    {
      id: "household-id",
      label: "Household ID",
      icon: "🏠",
    },
    {
      id: "registration",
      label: "Registration",
      icon: "📝",
    },
    {
      id: "security",
      label: "Security",
      icon: "🔐",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
    },
    {
      id: "data",
      label: "Data",
      icon: "🗄️",
    },
    {
      id: "identity",
      label: "Identity & QR",
      icon: "🪪",
    },
  ];

  const scrollToSection = (
    sectionId
  ) => {
    setActiveSection(
      sectionId
    );

    const element =
      document.getElementById(
        sectionId
      );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <p>
            Loading system settings...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="dashboard-page system-settings-page">

      {/* ===================================================
          HEADER
      ==================================================== */}

      <div className="dashboard-header system-settings-header">

        <div>
          <div className="breadcrumb">
            TA-HOSS LOG / System Settings
          </div>

          <h1>
            System Settings
          </h1>

          <p>
            Configure and manage the
            TA-HOSS LOG system,
            community information,
            registration controls,
            security and digital
            identity settings.
          </p>
        </div>

        <div className="system-settings-header-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadSettings
            }
            disabled={
              loading ||
              saving ||
              resetting
            }
          >
            ↻ Reload
          </button>

          <button
            type="submit"
            form="system-settings-form"
            className="primary-button"
            disabled={
              saving ||
              resetting
            }
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>

      </div>

      {/* ===================================================
          SUCCESS MESSAGE
      ==================================================== */}

      {success && (
        <div className="system-settings-alert system-settings-success">

          <div>
            <strong>
              Success
            </strong>

            <span>
              {success}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Close success message"
          >
            ×
          </button>

        </div>
      )}

      {/* ===================================================
          ERROR MESSAGE
      ==================================================== */}

      {error && (
        <div className="system-settings-alert system-settings-error">

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
            onClick={() =>
              setError("")
            }
            aria-label="Close error message"
          >
            ×
          </button>

        </div>
      )}

      {/* ===================================================
          MAIN CONTENT
      ==================================================== */}

      <div className="system-settings-layout">

        {/* ===============================================
            SIDEBAR
        ================================================ */}

        <aside className="system-settings-sidebar">

          <div className="settings-sidebar-title">
            <span>
              SETTINGS MENU
            </span>
          </div>

          <nav className="settings-navigation">

            {sections.map(
              (section) => (
                <button
                  key={section.id}
                  type="button"
                  className={
                    activeSection ===
                    section.id
                      ? "settings-nav-item active"
                      : "settings-nav-item"
                  }
                  onClick={() =>
                    scrollToSection(
                      section.id
                    )
                  }
                >
                  <span className="settings-nav-icon">
                    {section.icon}
                  </span>

                  <span>
                    {section.label}
                  </span>
                </button>
              )
            )}

          </nav>

          <div className="settings-sidebar-info">

            <strong>
              Administrator Access
            </strong>

            <span>
              Changes made here affect
              the entire TA-HOSS LOG
              system.
            </span>

          </div>

        </aside>

        {/* ===============================================
            FORM
        ================================================ */}

        <form
          id="system-settings-form"
          className="system-settings-form"
          onSubmit={
            handleSave
          }
        >

          {/* =============================================
              COMMUNITY INFORMATION
          ============================================== */}

          <section
            id="community"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🏘️ Community Information
                </h2>

                <p>
                  Configure the official
                  information for Ta-hoss
                  Community.
                </p>
              </div>

            </div>

            <div className="settings-form-grid">

              <label className="settings-field settings-field-full">

                <span>
                  Community Name
                </span>

                <input
                  type="text"
                  value={
                    settings.community
                      .name
                  }
                  onChange={handleTextChange(
                    "community",
                    "name"
                  )}
                />

              </label>

              <label className="settings-field settings-field-full">

                <span>
                  Description
                </span>

                <textarea
                  rows="4"
                  value={
                    settings.community
                      .description
                  }
                  onChange={handleTextChange(
                    "community",
                    "description"
                  )}
                  placeholder="Brief description of the community"
                />

              </label>

              <label className="settings-field settings-field-full">

                <span>
                  Address
                </span>

                <input
                  type="text"
                  value={
                    settings.community
                      .address
                  }
                  onChange={handleTextChange(
                    "community",
                    "address"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Local Government
                </span>

                <input
                  type="text"
                  value={
                    settings.community
                      .localGovernment
                  }
                  onChange={handleTextChange(
                    "community",
                    "localGovernment"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  State
                </span>

                <input
                  type="text"
                  value={
                    settings.community
                      .state
                  }
                  onChange={handleTextChange(
                    "community",
                    "state"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Country
                </span>

                <input
                  type="text"
                  value={
                    settings.community
                      .country
                  }
                  onChange={handleTextChange(
                    "community",
                    "country"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Phone Number
                </span>

                <input
                  type="tel"
                  value={
                    settings.community
                      .phoneNumber
                  }
                  onChange={handleTextChange(
                    "community",
                    "phoneNumber"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Email Address
                </span>

                <input
                  type="email"
                  value={
                    settings.community
                      .email
                  }
                  onChange={handleTextChange(
                    "community",
                    "email"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  GPS Latitude
                </span>

                <input
                  type="number"
                  step="any"
                  value={
                    settings.community
                      .gps
                      ?.latitude ?? ""
                  }
                  onChange={(event) =>
                    updateNestedSection(
                      "community",
                      "gps",
                      "latitude",
                      event.target.value === ""
                        ? ""
                        : Number(
                            event.target.value
                          )
                    )
                  }
                />

              </label>

              <label className="settings-field">

                <span>
                  GPS Longitude
                </span>

                <input
                  type="number"
                  step="any"
                  value={
                    settings.community
                      .gps
                      ?.longitude ?? ""
                  }
                  onChange={(event) =>
                    updateNestedSection(
                      "community",
                      "gps",
                      "longitude",
                      event.target.value === ""
                        ? ""
                        : Number(
                            event.target.value
                          )
                    )
                  }
                />

              </label>

            </div>

          </section>

          {/* =============================================
              SYSTEM CONFIGURATION
          ============================================== */}

          <section
            id="system"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  ⚙️ System Configuration
                </h2>

                <p>
                  Configure the general
                  behavior and appearance
                  of TA-HOSS LOG.
                </p>
              </div>

            </div>

            <div className="settings-form-grid">

              <label className="settings-field">

                <span>
                  System Name
                </span>

                <input
                  type="text"
                  value={
                    settings.system.name
                  }
                  onChange={handleTextChange(
                    "system",
                    "name"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Short Name
                </span>

                <input
                  type="text"
                  value={
                    settings.system
                      .shortName
                  }
                  onChange={handleTextChange(
                    "system",
                    "shortName"
                  )}
                />

              </label>

              <label className="settings-field settings-field-full">

                <span>
                  System Description
                </span>

                <textarea
                  rows="4"
                  value={
                    settings.system
                      .description
                  }
                  onChange={handleTextChange(
                    "system",
                    "description"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Timezone
                </span>

                <select
                  value={
                    settings.system
                      .timezone
                  }
                  onChange={handleTextChange(
                    "system",
                    "timezone"
                  )}
                >
                  <option value="Africa/Lagos">
                    Africa/Lagos
                  </option>

                  <option value="UTC">
                    UTC
                  </option>

                </select>

              </label>

              <label className="settings-field">

                <span>
                  Language
                </span>

                <select
                  value={
                    settings.system
                      .language
                  }
                  onChange={handleTextChange(
                    "system",
                    "language"
                  )}
                >
                  <option value="en">
                    English
                  </option>
                </select>

              </label>

              <label className="settings-field">

                <span>
                  Date Format
                </span>

                <select
                  value={
                    settings.system
                      .dateFormat
                  }
                  onChange={handleTextChange(
                    "system",
                    "dateFormat"
                  )}
                >
                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY
                  </option>

                  <option value="MM/DD/YYYY">
                    MM/DD/YYYY
                  </option>

                  <option value="YYYY-MM-DD">
                    YYYY-MM-DD
                  </option>
                </select>

              </label>

              <label className="settings-field">

                <span>
                  Default Page Size
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.system
                      .defaultPageSize
                  }
                  onChange={handleNumberChange(
                    "system",
                    "defaultPageSize"
                  )}
                />

              </label>

            </div>

            <div className="settings-toggle-group">

              <label className="settings-toggle-card">

                <div>

                  <strong>
                    Maintenance Mode
                  </strong>

                  <span>
                    Temporarily restrict
                    normal access while
                    maintenance is being
                    performed.
                  </span>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.system
                      .maintenanceMode
                  }
                  onChange={handleToggleChange(
                    "system",
                    "maintenanceMode"
                  )}
                />

                <span className="toggle-switch" />

              </label>

            </div>

            {settings.system
              .maintenanceMode && (

              <label className="settings-field settings-field-full maintenance-message-field">

                <span>
                  Maintenance Message
                </span>

                <textarea
                  rows="3"
                  value={
                    settings.system
                      .maintenanceMessage
                  }
                  onChange={handleTextChange(
                    "system",
                    "maintenanceMessage"
                  )}
                />

              </label>
            )}

          </section>

          {/* =============================================
              RESIDENT ID SETTINGS
          ============================================== */}

          <section
            id="resident-id"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  👤 Resident ID Configuration
                </h2>

                <p>
                  Configure automatic
                  resident identification
                  numbers.
                </p>
              </div>

            </div>

            <div className="id-preview-card">

              <span>
                Next Resident ID Preview
              </span>

              <strong>
                {residentIdPreview}
              </strong>

            </div>

            <div className="settings-toggle-group">

              <label className="settings-toggle-card">

                <div>

                  <strong>
                    Enable Resident ID
                    Generation
                  </strong>

                  <span>
                    Automatically generate
                    unique IDs for new
                    residents.
                  </span>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings
                      .residentIdSettings
                      .enabled
                  }
                  onChange={handleToggleChange(
                    "residentIdSettings",
                    "enabled"
                  )}
                />

                <span className="toggle-switch" />

              </label>

            </div>

            <div className="settings-form-grid">

              <label className="settings-field">

                <span>
                  Prefix
                </span>

                <input
                  type="text"
                  value={
                    settings
                      .residentIdSettings
                      .prefix
                  }
                  onChange={handleTextChange(
                    "residentIdSettings",
                    "prefix"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Separator
                </span>

                <input
                  type="text"
                  value={
                    settings
                      .residentIdSettings
                      .separator
                  }
                  onChange={handleTextChange(
                    "residentIdSettings",
                    "separator"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Number Length
                </span>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={
                    settings
                      .residentIdSettings
                      .numberLength
                  }
                  onChange={handleNumberChange(
                    "residentIdSettings",
                    "numberLength"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Next Number
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings
                      .residentIdSettings
                      .nextNumber
                  }
                  onChange={handleNumberChange(
                    "residentIdSettings",
                    "nextNumber"
                  )}
                />

              </label>

            </div>

          </section>

          {/* =============================================
              HOUSEHOLD ID SETTINGS
          ============================================== */}

          <section
            id="household-id"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🏠 Household ID Configuration
                </h2>

                <p>
                  Configure automatic
                  household identification
                  numbers.
                </p>
              </div>

            </div>

            <div className="id-preview-card">

              <span>
                Next Household ID Preview
              </span>

              <strong>
                {householdIdPreview}
              </strong>

            </div>

            <div className="settings-toggle-group">

              <label className="settings-toggle-card">

                <div>

                  <strong>
                    Enable Household ID
                    Generation
                  </strong>

                  <span>
                    Automatically generate
                    unique IDs for new
                    households.
                  </span>

                </div>

                <input
                  type="checkbox"
                  checked={
                    settings
                      .householdIdSettings
                      .enabled
                  }
                  onChange={handleToggleChange(
                    "householdIdSettings",
                    "enabled"
                  )}
                />

                <span className="toggle-switch" />

              </label>

            </div>

            <div className="settings-form-grid">

              <label className="settings-field">

                <span>
                  Prefix
                </span>

                <input
                  type="text"
                  value={
                    settings
                      .householdIdSettings
                      .prefix
                  }
                  onChange={handleTextChange(
                    "householdIdSettings",
                    "prefix"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Separator
                </span>

                <input
                  type="text"
                  value={
                    settings
                      .householdIdSettings
                      .separator
                  }
                  onChange={handleTextChange(
                    "householdIdSettings",
                    "separator"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Number Length
                </span>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={
                    settings
                      .householdIdSettings
                      .numberLength
                  }
                  onChange={handleNumberChange(
                    "householdIdSettings",
                    "numberLength"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Next Number
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings
                      .householdIdSettings
                      .nextNumber
                  }
                  onChange={handleNumberChange(
                    "householdIdSettings",
                    "nextNumber"
                  )}
                />

              </label>

            </div>

          </section>

          {/* =============================================
              REGISTRATION SETTINGS
          ============================================== */}

          <section
            id="registration"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  📝 Registration Controls
                </h2>

                <p>
                  Control how residents
                  and households are
                  registered.
                </p>
              </div>

            </div>

            <div className="settings-toggle-list">

              {[
                [
                  "allowResidentRegistration",
                  "Allow Resident Registration",
                  "Allow new residents to be registered in the system.",
                ],

                [
                  "allowHouseholdRegistration",
                  "Allow Household Registration",
                  "Allow new households to be created.",
                ],

                [
                  "requireVerification",
                  "Require Verification",
                  "Require verification for newly registered residents.",
                ],

                [
                  "requirePhoto",
                  "Require Photo",
                  "Require a resident photo during registration.",
                ],

                [
                  "requirePhoneNumber",
                  "Require Phone Number",
                  "Require a phone number during registration.",
                ],

                [
                  "requireGps",
                  "Require GPS",
                  "Require GPS information during registration.",
                ],

                [
                  "requireBiometric",
                  "Require Biometric",
                  "Require biometric enrollment during registration.",
                ],
              ].map(
                ([
                  field,
                  title,
                  description,
                ]) => (
                  <label
                    className="settings-toggle-card"
                    key={field}
                  >

                    <div>

                      <strong>
                        {title}
                      </strong>

                      <span>
                        {description}
                      </span>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings
                          .registration[
                          field
                        ]
                      }
                      onChange={handleToggleChange(
                        "registration",
                        field
                      )}
                    />

                    <span className="toggle-switch" />

                  </label>
                )
              )}

            </div>

            <div className="settings-form-grid settings-top-margin">

              <label className="settings-field">

                <span>
                  Default Resident Status
                </span>

                <select
                  value={
                    settings.registration
                      .defaultResidentStatus
                  }
                  onChange={handleTextChange(
                    "registration",
                    "defaultResidentStatus"
                  )}
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

              </label>

              <label className="settings-field">

                <span>
                  Default Verification
                  Status
                </span>

                <select
                  value={
                    settings.registration
                      .defaultVerificationStatus
                  }
                  onChange={handleTextChange(
                    "registration",
                    "defaultVerificationStatus"
                  )}
                >
                  <option value="pending">
                    Pending
                  </option>

                  <option value="verified">
                    Verified
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>

              </label>

              <label className="settings-field">

                <span>
                  Default Identity Status
                </span>

                <select
                  value={
                    settings.registration
                      .defaultIdentityStatus
                  }
                  onChange={handleTextChange(
                    "registration",
                    "defaultIdentityStatus"
                  )}
                >
                  <option value="pending">
                    Pending
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>
                </select>

              </label>

            </div>

          </section>

          {/* =============================================
              SECURITY SETTINGS
          ============================================== */}

          <section
            id="security"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🔐 Security Settings
                </h2>

                <p>
                  Configure account and
                  password security
                  requirements.
                </p>
              </div>

            </div>

            <div className="settings-form-grid">

              <label className="settings-field">

                <span>
                  Session Timeout
                  (Minutes)
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.security
                      .sessionTimeoutMinutes
                  }
                  onChange={handleNumberChange(
                    "security",
                    "sessionTimeoutMinutes"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Maximum Login Attempts
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.security
                      .maxLoginAttempts
                  }
                  onChange={handleNumberChange(
                    "security",
                    "maxLoginAttempts"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Lockout Duration
                  (Minutes)
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.security
                      .lockoutDurationMinutes
                  }
                  onChange={handleNumberChange(
                    "security",
                    "lockoutDurationMinutes"
                  )}
                />

              </label>

              <label className="settings-field">

                <span>
                  Minimum Password Length
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.security
                      .minimumPasswordLength
                  }
                  onChange={handleNumberChange(
                    "security",
                    "minimumPasswordLength"
                  )}
                />

              </label>

            </div>

            <div className="settings-subheading">

              Password Requirements

            </div>

            <div className="settings-toggle-list">

              {[
                [
                  "requireUppercase",
                  "Require Uppercase Letter",
                ],

                [
                  "requireLowercase",
                  "Require Lowercase Letter",
                ],

                [
                  "requireNumber",
                  "Require Number",
                ],

                [
                  "requireSpecialCharacter",
                  "Require Special Character",
                ],
              ].map(
                ([
                  field,
                  title,
                ]) => (
                  <label
                    className="settings-toggle-card"
                    key={field}
                  >

                    <div>

                      <strong>
                        {title}
                      </strong>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings.security[
                          field
                        ]
                      }
                      onChange={handleToggleChange(
                        "security",
                        field
                      )}
                    />

                    <span className="toggle-switch" />

                  </label>
                )
              )}

            </div>

          </section>

          {/* =============================================
              NOTIFICATIONS
          ============================================== */}

          <section
            id="notifications"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🔔 Notification Settings
                </h2>

                <p>
                  Control notifications
                  generated by the system.
                </p>
              </div>

            </div>

            <div className="settings-toggle-list">

              {[
                [
                  "enabled",
                  "Enable Notifications",
                  "Turn system notifications on or off.",
                ],

                [
                  "registrationNotifications",
                  "Registration Notifications",
                  "Receive notifications for registration activities.",
                ],

                [
                  "verificationNotifications",
                  "Verification Notifications",
                  "Receive notifications for verification activities.",
                ],

                [
                  "identityNotifications",
                  "Identity Notifications",
                  "Receive notifications related to digital identity.",
                ],

                [
                  "systemNotifications",
                  "System Notifications",
                  "Receive important system-level notifications.",
                ],
              ].map(
                ([
                  field,
                  title,
                  description,
                ]) => (
                  <label
                    className="settings-toggle-card"
                    key={field}
                  >

                    <div>

                      <strong>
                        {title}
                      </strong>

                      <span>
                        {description}
                      </span>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings
                          .notifications[
                          field
                        ]
                      }
                      onChange={handleToggleChange(
                        "notifications",
                        field
                      )}
                    />

                    <span className="toggle-switch" />

                  </label>
                )
              )}

            </div>

          </section>

          {/* =============================================
              DATA MANAGEMENT
          ============================================== */}

          <section
            id="data"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🗄️ Data Management
                </h2>

                <p>
                  Configure backup,
                  audit logging and
                  record retention
                  settings.
                </p>
              </div>

            </div>

            <div className="settings-toggle-list">

              {[
                [
                  "autoBackupEnabled",
                  "Automatic Backup",
                  "Automatically back up system data.",
                ],

                [
                  "auditLoggingEnabled",
                  "Audit Logging",
                  "Record important system and administrator activities.",
                ],

                [
                  "softDeleteEnabled",
                  "Soft Delete",
                  "Keep deleted records available for recovery instead of permanently deleting them.",
                ],
              ].map(
                ([
                  field,
                  title,
                  description,
                ]) => (
                  <label
                    className="settings-toggle-card"
                    key={field}
                  >

                    <div>

                      <strong>
                        {title}
                      </strong>

                      <span>
                        {description}
                      </span>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings
                          .dataManagement[
                          field
                        ]
                      }
                      onChange={handleToggleChange(
                        "dataManagement",
                        field
                      )}
                    />

                    <span className="toggle-switch" />

                  </label>
                )
              )}

            </div>

            <div className="settings-form-grid settings-top-margin">

              <label className="settings-field">

                <span>
                  Backup Frequency
                </span>

                <select
                  value={
                    settings
                      .dataManagement
                      .backupFrequency
                  }
                  onChange={handleTextChange(
                    "dataManagement",
                    "backupFrequency"
                  )}
                >
                  <option value="manual">
                    Manual
                  </option>

                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>

              </label>

            </div>

          </section>

          {/* =============================================
              IDENTITY SETTINGS
          ============================================== */}

          <section
            id="identity"
            className="dashboard-panel settings-section"
          >

            <div className="panel-header">

              <div>
                <h2>
                  🪪 Digital Identity & QR
                </h2>

                <p>
                  Configure resident
                  digital identity and QR
                  verification features.
                </p>
              </div>

            </div>

            <div className="settings-toggle-list">

              {[
                [
                  "enableQrIdentity",
                  "Enable QR Identity",
                  "Allow residents to use QR-based digital identity verification.",
                ],

                [
                  "allowIdentitySuspension",
                  "Allow Identity Suspension",
                  "Allow administrators to suspend resident digital identities.",
                ],

                [
                  "requireVerificationBeforeIdentityActivation",
                  "Require Verification Before Activation",
                  "Residents must be verified before their digital identity becomes active.",
                ],
              ].map(
                ([
                  field,
                  title,
                  description,
                ]) => (
                  <label
                    className="settings-toggle-card"
                    key={field}
                  >

                    <div>

                      <strong>
                        {title}
                      </strong>

                      <span>
                        {description}
                      </span>

                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings.identity[
                          field
                        ]
                      }
                      onChange={handleToggleChange(
                        "identity",
                        field
                      )}
                    />

                    <span className="toggle-switch" />

                  </label>
                )
              )}

            </div>

            <div className="settings-form-grid settings-top-margin">

              <label className="settings-field">

                <span>
                  QR Token Expiry
                  (Days)
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    settings.identity
                      .qrTokenExpiryDays
                  }
                  onChange={handleNumberChange(
                    "identity",
                    "qrTokenExpiryDays"
                  )}
                />

              </label>

            </div>

          </section>

          {/* =============================================
              SYSTEM ACTIONS
          ============================================== */}

          <section className="dashboard-panel system-actions-panel">

            <div>

              <h2>
                System Actions
              </h2>

              <p>
                Save your configuration
                changes or reset all
                settings to their default
                values.
              </p>

            </div>

            <div className="system-actions-buttons">

              <button
                type="submit"
                className="primary-button"
                disabled={
                  saving ||
                  resetting
                }
              >
                {saving
                  ? "Saving Changes..."
                  : "Save All Changes"}
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={
                  handleReset
                }
                disabled={
                  saving ||
                  resetting
                }
              >
                {resetting
                  ? "Resetting..."
                  : "Reset to Defaults"}
              </button>

            </div>

          </section>

        </form>

      </div>

    </div>
  );
};

export default SystemSettingsPage;