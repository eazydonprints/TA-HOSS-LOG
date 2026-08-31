const mongoose = require("mongoose");

/*
 * =========================================================
 * WEBAUTHN / BIOMETRIC CREDENTIAL SCHEMA
 * =========================================================
 */

const biometricCredentialSchema = new mongoose.Schema(
  {
    credentialID: {
      type: String,
      required: true,
      trim: true,
    },

    publicKey: {
      type: String,
      required: true,
    },

    counter: {
      type: Number,
      default: 0,
      min: 0,
    },

    transports: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    deviceName: {
      type: String,
      default: "",
      trim: true,
    },

    authenticatorType: {
      type: String,
      enum: ["platform", "cross_platform", "unknown"],
      default: "unknown",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

/*
 * =========================================================
 * OTP VERIFICATION SCHEMA
 * =========================================================
 */

const verificationOTPSchema = new mongoose.Schema(
  {
    hash: {
      type: String,
      default: null,
      select: false,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    method: {
      type: String,
      enum: ["email", "phone", null],
      default: null,
    },
  },
  {
    _id: false,
  }
);

/*
 * =========================================================
 * USER SCHEMA
 * =========================================================
 */

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    middleName: {
      type: String,
      trim: true,
      default: null,
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    /*
     * =======================================================
     * USER ROLE
     * =======================================================
     */

    role: {
      type: String,
      enum: [
        "super_admin",
        "registration_officer",
        "verification_officer",
        "viewer",
        "public_user",
      ],
      default: "viewer",
    },

    /*
     * =======================================================
     * ACCOUNT TYPE
     *
     * community = TA-HOSS LOG community account
     * system    = system/administrative account
     * public    = public account
     * =======================================================
     */

    accountType: {
      type: String,
      enum: [
        "community",
        "system",
        "public",
      ],
      default: "community",
    },

    /*
     * =======================================================
     * ACCOUNT STATUS
     * =======================================================
     */

    accountStatus: {
      type: String,
      enum: [
        "pending_verification",
        "active",
        "suspended",
        "disabled",
      ],
      default: "active",
    },

    /*
     * =======================================================
     * PROFILE PHOTO
     * =======================================================
     */

    photo: {
      type: String,
      default: null,
      trim: true,
    },

    photoPublicId: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * =======================================================
     * ACCOUNT STATE
     * =======================================================
     */

    isActive: {
      type: Boolean,
      default: true,
    },

    /*
     * =======================================================
     * OTP
     * =======================================================
     */

    verificationOTP: {
      type: verificationOTPSchema,
      default: () => ({}),
    },

    /*
     * =======================================================
     * BIOMETRIC / WEBAUTHN
     * =======================================================
     */

    biometricEnabled: {
      type: Boolean,
      default: false,
    },

    biometricCredentials: {
      type: [biometricCredentialSchema],
      default: [],
    },

    biometricEnrolledAt: {
      type: Date,
      default: null,
    },

    biometricLastLoginAt: {
      type: Date,
      default: null,
    },

    /*
     * =======================================================
     * LOGIN TRACKING
     * =======================================================
     */

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIP: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * =======================================================
     * BIOMETRIC CHALLENGE
     * =======================================================
     */

    biometricChallenge: {
      value: {
        type: String,
        default: null,
        select: false,
      },

      type: {
        type: String,
        enum: [
          "registration",
          "authentication",
          null,
        ],
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },
    },

    /*
     * =======================================================
     * SOFT DELETE
     * =======================================================
     */

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

userSchema.index({
  username: 1,
  deletedAt: 1,
});

userSchema.index(
  { email: 1 },
  { sparse: true }
);

userSchema.index(
  { phone: 1 },
  { sparse: true }
);

userSchema.index({
  role: 1,
  isActive: 1,
});

userSchema.index({
  accountType: 1,
  accountStatus: 1,
});

userSchema.index({
  deletedAt: 1,
  isActive: 1,
});

userSchema.index({
  biometricEnabled: 1,
  isActive: 1,
});

/*
 * =========================================================
 * PRE-SAVE MIDDLEWARE
 * =========================================================
 */

userSchema.pre("save", function () {
  if (this.username) {
    this.username =
      this.username
        .trim()
        .toLowerCase();
  }

  if (this.email) {
    this.email =
      this.email
        .trim()
        .toLowerCase();
  }

  if (this.phone) {
    this.phone =
      this.phone.trim();
  }

  /*
   * Existing embedded biometric credential
   * synchronization.
   *
   * This is preserved exactly from your
   * existing model.
   */

  if (
    Array.isArray(
      this.biometricCredentials
    )
  ) {
    const activeCredentials =
      this.biometricCredentials.filter(
        (credential) =>
          credential.isActive
      );

    this.biometricEnabled =
      activeCredentials.length > 0;
  }
});

/*
 * =========================================================
 * INSTANCE METHOD
 * =========================================================
 */

userSchema.methods.toSafeObject =
  function () {
    return {
      id: this._id,

      fullname:
        this.fullname,

      firstName:
        this.firstName,

      middleName:
        this.middleName,

      lastName:
        this.lastName,

      username:
        this.username,

      email:
        this.email,

      phone:
        this.phone,

      role:
        this.role,

      accountType:
        this.accountType,

      accountStatus:
        this.accountStatus,

      photo:
        this.photo,

      biometricEnabled:
        this.biometricEnabled,

      biometricCredentialCount:
        this.biometricCredentials
          ? this.biometricCredentials.filter(
              (credential) =>
                credential.isActive
            ).length
          : 0,

      emailVerified:
        this.emailVerified,

      phoneVerified:
        this.phoneVerified,

      isActive:
        this.isActive,

      lastLoginAt:
        this.lastLoginAt,

      biometricLastLoginAt:
        this.biometricLastLoginAt,

      createdAt:
        this.createdAt,
    };
  };

/*
 * =========================================================
 * EXPORT MODEL
 * =========================================================
 */

module.exports =
  mongoose.model(
    "User",
    userSchema
  );