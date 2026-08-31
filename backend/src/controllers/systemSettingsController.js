const SystemSettings = require("../models/SystemSettings");

// =========================================================
// SETTINGS CONSTANT
// =========================================================

const SETTINGS_KEY =
  "TA_HOSS_LOG_SYSTEM_SETTINGS";

// =========================================================
// DEFAULT SETTINGS
// =========================================================

const getDefaultSettings = () => {
  return {
    settingsKey: SETTINGS_KEY,

    // =====================================================
    // COMMUNITY SETTINGS
    // =====================================================

    community: {
      name: "Ta-hoss",
      description: "",
      address: "",
      localGovernment: "Riyom",
      state: "Plateau",
      country: "Nigeria",
      phoneNumber: "",
      email: "",
      logo: null,
      logoPublicId: null,

      gps: {
        latitude: null,
        longitude: null,
      },
    },

    // =====================================================
    // SYSTEM SETTINGS
    // =====================================================

    system: {
      name: "TA-HOSS LOG",
      shortName: "TA-HOSS LOG",

      description:
        "Ta-hoss Community Management and Information System",

      logo: null,
      logoPublicId: null,

      timezone: "Africa/Lagos",
      language: "en",

      dateFormat: "DD/MM/YYYY",

      defaultPageSize: 15,

      maintenanceMode: false,

      maintenanceMessage:
        "The system is currently undergoing maintenance. Please try again later.",
    },

    // =====================================================
    // RESIDENT ID SETTINGS
    // =====================================================

    residentIdSettings: {
      enabled: true,

      prefix: "THR",

      separator: "-",

      numberLength: 6,

      nextNumber: 1,
    },

    // =====================================================
    // HOUSEHOLD ID SETTINGS
    // =====================================================

    householdIdSettings: {
      enabled: true,

      prefix: "THH",

      separator: "-",

      numberLength: 6,

      nextNumber: 1,
    },

    // =====================================================
    // REGISTRATION SETTINGS
    // =====================================================

    registration: {
      allowResidentRegistration: true,

      allowHouseholdRegistration: true,

      requireVerification: true,

      requirePhoto: false,

      requirePhoneNumber: false,

      requireGps: false,

      requireBiometric: false,

      defaultResidentStatus: "active",

      defaultVerificationStatus:
        "pending",

      defaultIdentityStatus:
        "pending",
    },

    // =====================================================
    // SECURITY SETTINGS
    // =====================================================

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

    // =====================================================
    // NOTIFICATION SETTINGS
    // =====================================================

    notifications: {
      enabled: true,

      registrationNotifications: true,

      verificationNotifications: true,

      identityNotifications: true,

      systemNotifications: true,
    },

    // =====================================================
    // DATA MANAGEMENT
    // =====================================================

    dataManagement: {
      autoBackupEnabled: false,

      backupFrequency: "manual",

      lastBackupAt: null,

      auditLoggingEnabled: true,

      softDeleteEnabled: true,
    },

    // =====================================================
    // DIGITAL IDENTITY
    // =====================================================

    identity: {
      enableQrIdentity: true,

      qrTokenExpiryDays: 365,

      allowIdentitySuspension: true,

      requireVerificationBeforeIdentityActivation:
        true,
    },
  };
};

// =========================================================
// GET OR CREATE SYSTEM SETTINGS
// =========================================================

const getOrCreateSettings =
  async () => {
    let settings =
      await SystemSettings.findOne({
        settingsKey: SETTINGS_KEY,
      });

    if (!settings) {
      settings =
        await SystemSettings.create(
          getDefaultSettings()
        );
    }

    return settings;
  };

// =========================================================
// GET SYSTEM SETTINGS
// =========================================================
// GET /api/v1/settings
// =========================================================

const getSystemSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      return res.status(200).json({
        success: true,

        message:
          "System settings retrieved successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "GET SYSTEM SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve system settings.",
      });
    }
  };

// =========================================================
// UPDATE ALL SYSTEM SETTINGS
// =========================================================
// PUT /api/v1/settings
// =========================================================

const updateSystemSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      const allowedSections = [
        "community",
        "system",
        "residentIdSettings",
        "householdIdSettings",
        "registration",
        "security",
        "notifications",
        "dataManagement",
        "identity",
      ];

      allowedSections.forEach(
        (section) => {
          if (
            req.body?.[section] !==
            undefined
          ) {
            settings[section] =
              req.body[section];
          }
        }
      );

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "System settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE SYSTEM SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          );

        return res.status(400).json({
          success: false,

          message:
            "Validation failed.",

          errors,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update system settings.",
      });
    }
  };

// =========================================================
// UPDATE COMMUNITY SETTINGS
// =========================================================
// PUT /api/v1/settings/community
// =========================================================

const updateCommunitySettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.community = {
        ...settings.community.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Community settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE COMMUNITY SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Community settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update community settings.",
      });
    }
  };

// =========================================================
// UPDATE SYSTEM INFORMATION
// =========================================================
// PUT /api/v1/settings/system
// =========================================================

const updateSystemInformation =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.system = {
        ...settings.system.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "System information updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE SYSTEM INFORMATION ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "System information validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update system information.",
      });
    }
  };

// =========================================================
// UPDATE REGISTRATION SETTINGS
// =========================================================
// PUT /api/v1/settings/registration
// =========================================================

const updateRegistrationSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.registration = {
        ...settings.registration.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Registration settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE REGISTRATION SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Registration settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update registration settings.",
      });
    }
  };

// =========================================================
// UPDATE RESIDENT ID SETTINGS
// =========================================================
// PUT /api/v1/settings/resident-id
// =========================================================

const updateResidentIdSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      // Prevent accidental modification
      // of the next generated number.
      const {
        nextNumber,
        ...safeData
      } = req.body;

      settings.residentIdSettings = {
        ...settings.residentIdSettings.toObject(),
        ...safeData,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Resident ID settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE RESIDENT ID SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Resident ID settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update Resident ID settings.",
      });
    }
  };

// =========================================================
// UPDATE HOUSEHOLD ID SETTINGS
// =========================================================
// PUT /api/v1/settings/household-id
// =========================================================

const updateHouseholdIdSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      // Prevent accidental modification
      // of the next generated number.
      const {
        nextNumber,
        ...safeData
      } = req.body;

      settings.householdIdSettings = {
        ...settings.householdIdSettings.toObject(),
        ...safeData,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Household ID settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE HOUSEHOLD ID SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Household ID settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update Household ID settings.",
      });
    }
  };

// =========================================================
// UPDATE SECURITY SETTINGS
// =========================================================
// PUT /api/v1/settings/security
// =========================================================

const updateSecuritySettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.security = {
        ...settings.security.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Security settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE SECURITY SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Security settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update security settings.",
      });
    }
  };

// =========================================================
// UPDATE NOTIFICATION SETTINGS
// =========================================================
// PUT /api/v1/settings/notifications
// =========================================================

const updateNotificationSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.notifications = {
        ...settings.notifications.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Notification settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE NOTIFICATION SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Notification settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update notification settings.",
      });
    }
  };

// =========================================================
// UPDATE DATA MANAGEMENT SETTINGS
// =========================================================
// PUT /api/v1/settings/data-management
// =========================================================

const updateDataManagementSettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.dataManagement = {
        ...settings.dataManagement.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Data management settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE DATA MANAGEMENT SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Data management settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update data management settings.",
      });
    }
  };

// =========================================================
// UPDATE DIGITAL IDENTITY SETTINGS
// =========================================================
// PUT /api/v1/settings/identity
// =========================================================

const updateIdentitySettings =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      settings.identity = {
        ...settings.identity.toObject(),
        ...req.body,
      };

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Digital identity settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE IDENTITY SETTINGS ERROR:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Digital identity settings validation failed.",

          errors:
            Object.values(
              error.errors
            ).map(
              (item) =>
                item.message
            ),
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update digital identity settings.",
      });
    }
  };

// =========================================================
// UPDATE MAINTENANCE MODE
// =========================================================
// PUT /api/v1/settings/maintenance
// =========================================================

const updateMaintenanceMode =
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      const {
        maintenanceMode,
        maintenanceMessage,
      } = req.body;

      if (
        typeof maintenanceMode ===
        "boolean"
      ) {
        settings.system.maintenanceMode =
          maintenanceMode;
      }

      if (
        maintenanceMessage !==
        undefined
      ) {
        settings.system.maintenanceMessage =
          maintenanceMessage;
      }

      settings.lastUpdatedBy =
        req.user?._id || null;

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Maintenance settings updated successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "UPDATE MAINTENANCE SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to update maintenance settings.",
      });
    }
  };

// =========================================================
// RESET SETTINGS TO DEFAULTS
// =========================================================
// POST /api/v1/settings/reset
// =========================================================

const resetSystemSettings =
  async (req, res) => {
    try {
      const existingSettings =
        await SystemSettings.findOne({
          settingsKey:
            SETTINGS_KEY,
        });

      const defaults =
        getDefaultSettings();

      if (existingSettings) {
        Object.assign(
          existingSettings,
          defaults
        );

        existingSettings.lastUpdatedBy =
          req.user?._id || null;

        await existingSettings.save();

        return res.status(200).json({
          success: true,

          message:
            "System settings have been reset to default values.",

          data:
            existingSettings,
        });
      }

      const settings =
        await SystemSettings.create({
          ...defaults,

          lastUpdatedBy:
            req.user?._id ||
            null,
        });

      return res.status(201).json({
        success: true,

        message:
          "System settings initialized successfully.",

        data: settings,
      });
    } catch (error) {
      console.error(
        "RESET SYSTEM SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to reset system settings.",
      });
    }
  };

// =========================================================
// EXPORT CONTROLLER
// =========================================================

module.exports = {
  getSystemSettings,

  updateSystemSettings,

  updateCommunitySettings,

  updateSystemInformation,

  updateRegistrationSettings,

  updateResidentIdSettings,

  updateHouseholdIdSettings,

  updateSecuritySettings,

  updateNotificationSettings,

  updateDataManagementSettings,

  updateIdentitySettings,

  updateMaintenanceMode,

  resetSystemSettings,

  getOrCreateSettings,
};