const mongoose = require("mongoose");

/*
 * =========================================================
 * BIOMETRIC MODEL
 * =========================================================
 *
 * TA-HOSS LOG
 *
 * This model stores biometric credential METADATA.
 *
 * IMPORTANT SECURITY RULE:
 *
 * Raw fingerprint images, raw facial images, raw iris scans,
 * or raw biometric templates MUST NOT be stored directly
 * in MongoDB.
 *
 * For browser/device biometrics, WebAuthn/passkeys are used.
 * The actual biometric verification happens locally on the
 * user's device/authenticator.
 *
 * For external biometric scanners, only an encrypted
 * provider/template reference should be stored.
 *
 * =========================================================
 */

/*
 * =========================================================
 * BIOMETRIC SCHEMA
 * =========================================================
 */

const biometricSchema = new mongoose.Schema(
  {
    /*
     * =======================================================
     * OWNER
     * =======================================================
     */

    ownerType: {
      type: String,
      enum: ["resident", "user"],
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      default: null,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /*
     * =======================================================
     * BIOMETRIC TYPE
     * =======================================================
     */

    biometricType: {
      type: String,
      enum: [
        "fingerprint",
        "face",
        "iris",
        "passkey",
        "device_biometric",
      ],
      default: "passkey",
      required: true,
      index: true,
      trim: true,
    },

    /*
     * =======================================================
     * PROVIDER
     * =======================================================
     */

    provider: {
      type: String,
      enum: [
        "webauthn",
        "android",
        "ios",
        "windows_hello",
        "touch_id",
        "external_scanner",
        "unknown",
      ],
      default: "webauthn",
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    /*
     * =======================================================
     * WEBAUTHN CREDENTIAL ID
     * =======================================================
     */

    credentialId: {
      type: String,
      trim: true,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    /*
     * =======================================================
     * WEBAUTHN PUBLIC KEY
     * =======================================================
     */

    publicKey: {
      type: String,
      default: null,
      trim: true,
      select: false,
    },

    /*
     * =======================================================
     * WEBAUTHN SIGN COUNT
     * =======================================================
     */

    counter: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * =======================================================
     * AUTHENTICATOR TRANSPORTS
     * =======================================================
     */

    transports: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      default: [],
    },

    /*
     * =======================================================
     * AUTHENTICATOR TYPE
     * =======================================================
     */

    authenticatorType: {
      type: String,
      enum: [
        "platform",
        "cross_platform",
        "unknown",
      ],
      default: "unknown",
      trim: true,
      index: true,
    },

    /*
     * =======================================================
     * DEVICE INFORMATION
     * =======================================================
     */

    deviceName: {
      type: String,
      trim: true,
      default: null,
    },

    deviceType: {
      type: String,
      enum: [
        "mobile",
        "desktop",
        "tablet",
        "security_key",
        "external_scanner",
        "unknown",
      ],
      default: "unknown",
      trim: true,
      index: true,
    },

    platform: {
      type: String,
      trim: true,
      default: null,
    },

    /*
     * =======================================================
     * WEBAUTHN AUTHENTICATOR SECURITY FLAGS
     * =======================================================
     */

    backupEligible: {
      type: Boolean,
      default: false,
    },

    backupState: {
      type: Boolean,
      default: false,
    },

    userVerified: {
      type: Boolean,
      default: false,
    },

    /*
     * =======================================================
     * EXTERNAL BIOMETRIC TEMPLATE REFERENCE
     * =======================================================
     */

    encryptedTemplateReference: {
      type: String,
      default: null,
      trim: true,
      select: false,
    },

    templateProvider: {
      type: String,
      trim: true,
      default: null,
    },

    /*
     * =======================================================
     * STATUS
     * =======================================================
     */

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "revoked",
        "suspended",
      ],
      default: "active",
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    /*
     * =======================================================
     * ENROLLMENT INFORMATION
     * =======================================================
     */

    enrolledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /*
     * =======================================================
     * LAST USAGE
     * =======================================================
     */

    lastUsedAt: {
      type: Date,
      default: null,
    },

    lastUsedIP: {
      type: String,
      trim: true,
      default: null,
    },

    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * =======================================================
     * REVOCATION
     * =======================================================
     */

    revokedAt: {
      type: Date,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revocationReason: {
      type: String,
      trim: true,
      default: null,
    },

    /*
     * =======================================================
     * SOFT DELETE
     * =======================================================
     */

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/*
 * =========================================================
 * VIRTUAL: credentialID
 * =========================================================
 */

biometricSchema.virtual("credentialID")
  .get(function () {
    return this.credentialId;
  })
  .set(function (value) {
    this.credentialId = value;
  });

/*
 * =========================================================
 * OWNER VALIDATION
 * =========================================================
 */

biometricSchema.pre("validate", async function () {
  const hasResident = Boolean(this.resident);
  const hasUser = Boolean(this.user);

  if (this.ownerType === "resident") {
    if (!hasResident || hasUser) {
      throw new Error(
        "A resident biometric record must belong to exactly one resident."
      );
    }
  }

  if (this.ownerType === "user") {
    if (!hasUser || hasResident) {
      throw new Error(
        "A user biometric record must belong to exactly one user."
      );
    }
  }
});

/*
 * =========================================================
 * WEBAUTHN VALIDATION
 * =========================================================
 */

biometricSchema.pre("validate", async function () {
  const isWebAuthn =
    this.provider === "webauthn" ||
    this.biometricType === "passkey";

  // Only enforce credentialId and publicKey when the status is explicitly 'active'
  if (isWebAuthn && this.status === "active") {
    if (!this.credentialId) {
      throw new Error("A WebAuthn/passkey biometric must have a credentialId.");
    }

    if (!this.publicKey) {
      throw new Error("A WebAuthn/passkey biometric must have a publicKey.");
    }
  }
});

/*
 * =========================================================
 * STATUS / REVOCATION CONSISTENCY
 * =========================================================
 */

biometricSchema.pre("save", async function () {
  if (this.status === "revoked" && !this.revokedAt) {
    this.revokedAt = new Date();
  }

  if (this.status !== "revoked") {
    this.revokedAt = null;
    this.revokedBy = null;
  }
});

/*
 * =========================================================
 * METHODS
 * =========================================================
 */

biometricSchema.methods.recordUsage = async function (ip = null) {
  this.lastUsedAt = new Date();

  if (ip) {
    this.lastUsedIP = ip;
  }

  this.usageCount += 1;

  return this.save();
};

biometricSchema.methods.revoke = async function (
  revokedBy = null,
  reason = null
) {
  this.status = "revoked";
  this.revokedAt = new Date();

  if (revokedBy) {
    this.revokedBy = revokedBy;
  }

  if (reason) {
    this.revocationReason = reason.trim();
  }

  return this.save();
};

biometricSchema.methods.suspend = async function () {
  this.status = "suspended";
  return this.save();
};

biometricSchema.methods.activate = async function () {
  this.status = "active";
  this.revokedAt = null;
  this.revokedBy = null;
  this.revocationReason = null;

  return this.save();
};

/*
 * =========================================================
 * SAFE JSON OUTPUT
 * =========================================================
 */

biometricSchema.set("toJSON", {
  virtuals: true,

  transform: function (document, returnedObject) {
    delete returnedObject.publicKey;
    delete returnedObject.encryptedTemplateReference;

    return returnedObject;
  },
});

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

biometricSchema.index({
  resident: 1,
  status: 1,
  deletedAt: 1,
});

biometricSchema.index({
  user: 1,
  status: 1,
  deletedAt: 1,
});

biometricSchema.index({
  ownerType: 1,
  status: 1,
  deletedAt: 1,
});

biometricSchema.index({
  credentialId: 1,
  status: 1,
  deletedAt: 1,
});

biometricSchema.index({
  provider: 1,
  deviceType: 1,
  status: 1,
});

biometricSchema.index({
  biometricType: 1,
  status: 1,
});

biometricSchema.index({
  enrolledAt: -1,
  status: 1,
});

/*
 * =========================================================
 * MODEL EXPORT
 * =========================================================
 */

module.exports =
  mongoose.models.Biometric ||
  mongoose.model("Biometric", biometricSchema);