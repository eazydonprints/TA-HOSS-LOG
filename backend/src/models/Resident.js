const mongoose = require("mongoose");

const residentSchema = new mongoose.Schema(
  {
    // =========================================================
    // RESIDENT IDENTITY
    // =========================================================

    residentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    // =========================================================
    // PERSONAL INFORMATION
    // =========================================================

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
      lowercase: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    maritalStatus: {
      type: String,
      enum: [
        "single",
        "married",
        "divorced",
        "widowed",
        "separated",
        "unknown",
      ],
      default: "unknown",
      lowercase: true,
    },

    // =========================================================
    // SOCIO-ECONOMIC INFORMATION
    // =========================================================

    occupation: {
      type: String,
      trim: true,
      default: "",
    },

    educationLevel: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================================================
    // HOUSEHOLD RELATIONSHIP
    // =========================================================

    relationshipToHead: {
      type: String,
      enum: [
        "head",
        "spouse",
        "child",
        "parent",
        "sibling",
        "grandparent",
        "grandchild",
        "relative",
        "other",
      ],
      required: true,
      lowercase: true,
    },

    // =========================================================
    // RESIDENT PHOTO
    // =========================================================

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

    // =========================================================
    // GPS INFORMATION
    // =========================================================

    gps: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },

      accuracy: {
        type: Number,
        min: 0,
      },

      capturedAt: {
        type: Date,
        default: null,
      },
    },

    // =========================================================
    // VERIFICATION
    // =========================================================

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "verified",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // =========================================================
    // BIOMETRIC INFORMATION
    // =========================================================

    biometric: {
      enrolled: {
        type: Boolean,
        default: false,
      },

      provider: {
        type: String,
        default: null,
        trim: true,
      },

      templateReference: {
        type: String,
        default: null,
        trim: true,
      },

      enrolledAt: {
        type: Date,
        default: null,
      },
    },

    // =========================================================
    // DIGITAL IDENTITY
    // =========================================================

    identityStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "suspended",
        "deceased",
        "moved",
      ],
      default: "pending",
      index: true,
    },

    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: null,
    },

    identityIssuedAt: {
      type: Date,
      default: null,
    },

    identityUpdatedAt: {
      type: Date,
      default: null,
    },

    // =========================================================
    // RESIDENT ACCOUNT STATUS
    // =========================================================

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "deleted",
      ],
      default: "active",
      index: true,
    },

    // =========================================================
    // REGISTRATION INFORMATION
    // =========================================================

    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =========================================================
    // SOFT DELETE INFORMATION
    // =========================================================

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    deletionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================================
// VIRTUAL - FULL NAME
// =========================================================

residentSchema.virtual("fullName").get(function () {
  return [
    this.firstName,
    this.middleName,
    this.lastName,
  ]
    .filter(Boolean)
    .join(" ");
});

// =========================================================
// JSON SETTINGS
// =========================================================

residentSchema.set("toJSON", {
  virtuals: true,
});

residentSchema.set("toObject", {
  virtuals: true,
});

// =========================================================
// INDEXES
// =========================================================

residentSchema.index({
  household: 1,
  relationshipToHead: 1,
});

residentSchema.index({
  firstName: 1,
  lastName: 1,
});

residentSchema.index({
  verificationStatus: 1,
  status: 1,
});

residentSchema.index({
  identityStatus: 1,
  status: 1,
});

residentSchema.index({
  deletedAt: 1,
  status: 1,
});

residentSchema.index({
  deletedBy: 1,
  deletedAt: 1,
});

// =========================================================
// EXPORT MODEL
// =========================================================

module.exports = mongoose.model(
  "Resident",
  residentSchema
);