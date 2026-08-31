const mongoose = require("mongoose");

// =========================================================
// SYSTEM SETTINGS SCHEMA
// =========================================================

const systemSettingsSchema = new mongoose.Schema(
  {
    // =====================================================
    // SINGLETON SETTINGS DOCUMENT
    // =====================================================

    settingsKey: {
      type: String,
      default: "TA_HOSS_LOG_SYSTEM_SETTINGS",
      unique: true,
      immutable: true,
    },

    // =====================================================
    // COMMUNITY SETTINGS
    // =====================================================

    community: {
      name: {
        type: String,
        required: true,
        trim: true,
        default: "Ta-hoss",
      },

      description: {
        type: String,
        trim: true,
        default: "",
      },

      address: {
        type: String,
        trim: true,
        default: "",
      },

      localGovernment: {
        type: String,
        trim: true,
        default: "Riyom",
      },

      state: {
        type: String,
        trim: true,
        default: "Plateau",
      },

      country: {
        type: String,
        trim: true,
        default: "Nigeria",
      },

      phoneNumber: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      logo: {
        type: String,
        default: null,
        trim: true,
      },

      logoPublicId: {
        type: String,
        default: null,
        trim: true,
      },

      gps: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
          default: null,
        },

        longitude: {
          type: Number,
          min: -180,
          max: 180,
          default: null,
        },
      },
    },

    // =====================================================
    // SYSTEM INFORMATION
    // =====================================================

    system: {
      name: {
        type: String,
        required: true,
        trim: true,
        default: "TA-HOSS LOG",
      },

      shortName: {
        type: String,
        trim: true,
        default: "TA-HOSS LOG",
      },

      description: {
        type: String,
        trim: true,
        default:
          "Ta-hoss Community Management and Information System",
      },

      logo: {
        type: String,
        default: null,
        trim: true,
      },

      logoPublicId: {
        type: String,
        default: null,
        trim: true,
      },

      timezone: {
        type: String,
        trim: true,
        default: "Africa/Lagos",
      },

      language: {
        type: String,
        trim: true,
        default: "en",
      },

      dateFormat: {
        type: String,
        trim: true,
        default: "DD/MM/YYYY",
      },

      defaultPageSize: {
        type: Number,
        default: 15,
        min: 5,
        max: 100,
      },

      maintenanceMode: {
        type: Boolean,
        default: false,
      },

      maintenanceMessage: {
        type: String,
        trim: true,
        default:
          "The system is currently undergoing maintenance. Please try again later.",
      },
    },

    // =====================================================
    // RESIDENT ID SETTINGS
    // =====================================================

    residentIdSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },

      prefix: {
        type: String,
        trim: true,
        uppercase: true,
        default: "THR",
      },

      separator: {
        type: String,
        trim: true,
        default: "-",
      },

      numberLength: {
        type: Number,
        default: 6,
        min: 3,
        max: 12,
      },

      nextNumber: {
        type: Number,
        default: 1,
        min: 1,
      },
    },

    // =====================================================
    // HOUSEHOLD ID SETTINGS
    // =====================================================

    householdIdSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },

      prefix: {
        type: String,
        trim: true,
        uppercase: true,
        default: "THH",
      },

      separator: {
        type: String,
        trim: true,
        default: "-",
      },

      numberLength: {
        type: Number,
        default: 6,
        min: 3,
        max: 12,
      },

      nextNumber: {
        type: Number,
        default: 1,
        min: 1,
      },
    },

    // =====================================================
    // REGISTRATION SETTINGS
    // =====================================================

    registration: {
      allowResidentRegistration: {
        type: Boolean,
        default: true,
      },

      allowHouseholdRegistration: {
        type: Boolean,
        default: true,
      },

      requireVerification: {
        type: Boolean,
        default: true,
      },

      requirePhoto: {
        type: Boolean,
        default: false,
      },

      requirePhoneNumber: {
        type: Boolean,
        default: false,
      },

      requireGps: {
        type: Boolean,
        default: false,
      },

      requireBiometric: {
        type: Boolean,
        default: false,
      },

      defaultResidentStatus: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
      },

      defaultVerificationStatus: {
        type: String,
        enum: [
          "pending",
          "verified",
          "rejected",
        ],
        default: "pending",
      },

      defaultIdentityStatus: {
        type: String,
        enum: [
          "pending",
          "active",
          "suspended",
        ],
        default: "pending",
      },
    },

    // =====================================================
    // SECURITY SETTINGS
    // =====================================================

    security: {
      sessionTimeoutMinutes: {
        type: Number,
        default: 60,
        min: 5,
        max: 1440,
      },

      maxLoginAttempts: {
        type: Number,
        default: 5,
        min: 1,
        max: 20,
      },

      lockoutDurationMinutes: {
        type: Number,
        default: 30,
        min: 1,
        max: 1440,
      },

      minimumPasswordLength: {
        type: Number,
        default: 8,
        min: 6,
        max: 128,
      },

      requireUppercase: {
        type: Boolean,
        default: false,
      },

      requireLowercase: {
        type: Boolean,
        default: true,
      },

      requireNumber: {
        type: Boolean,
        default: false,
      },

      requireSpecialCharacter: {
        type: Boolean,
        default: false,
      },
    },

    // =====================================================
    // NOTIFICATION SETTINGS
    // =====================================================

    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },

      registrationNotifications: {
        type: Boolean,
        default: true,
      },

      verificationNotifications: {
        type: Boolean,
        default: true,
      },

      identityNotifications: {
        type: Boolean,
        default: true,
      },

      systemNotifications: {
        type: Boolean,
        default: true,
      },
    },

    // =====================================================
    // BACKUP AND DATA SETTINGS
    // =====================================================

    dataManagement: {
      autoBackupEnabled: {
        type: Boolean,
        default: false,
      },

      backupFrequency: {
        type: String,
        enum: [
          "daily",
          "weekly",
          "monthly",
          "manual",
        ],
        default: "manual",
      },

      lastBackupAt: {
        type: Date,
        default: null,
      },

      auditLoggingEnabled: {
        type: Boolean,
        default: true,
      },

      softDeleteEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // =====================================================
    // DIGITAL ID SETTINGS
    // =====================================================

    identity: {
      enableQrIdentity: {
        type: Boolean,
        default: true,
      },

      qrTokenExpiryDays: {
        type: Number,
        default: 365,
        min: 1,
        max: 3650,
      },

      allowIdentitySuspension: {
        type: Boolean,
        default: true,
      },

      requireVerificationBeforeIdentityActivation: {
        type: Boolean,
        default: true,
      },
    },

    // =====================================================
    // AUDIT INFORMATION
    // =====================================================

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    initializedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


// =========================================================
// VIRTUALS
// =========================================================

systemSettingsSchema.virtual(
  "residentIdPreview"
).get(function () {
  const settings =
    this.residentIdSettings;

  if (!settings) {
    return "";
  }

  const number = String(
    settings.nextNumber || 1
  ).padStart(
    settings.numberLength || 6,
    "0"
  );

  return `${settings.prefix || "THR"}${
    settings.separator || "-"
  }${number}`;
});


systemSettingsSchema.virtual(
  "householdIdPreview"
).get(function () {
  const settings =
    this.householdIdSettings;

  if (!settings) {
    return "";
  }

  const number = String(
    settings.nextNumber || 1
  ).padStart(
    settings.numberLength || 6,
    "0"
  );

  return `${settings.prefix || "THH"}${
    settings.separator || "-"
  }${number}`;
});


// =========================================================
// JSON SETTINGS
// =========================================================

systemSettingsSchema.set(
  "toJSON",
  {
    virtuals: true,
  }
);

systemSettingsSchema.set(
  "toObject",
  {
    virtuals: true,
  }
);


// =========================================================
// EXPORT MODEL
// =========================================================

module.exports = mongoose.model(
  "SystemSettings",
  systemSettingsSchema
);