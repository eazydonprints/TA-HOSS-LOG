const mongoose = require("mongoose");

const residentSchema = new mongoose.Schema(
  {
    residentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

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
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
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
    },

    occupation: {
      type: String,
      trim: true,
    },

    educationLevel: {
      type: String,
      trim: true,
    },

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
    },

    photo: {
      url: String,
      publicId: String,
    },

    gps: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      capturedAt: Date,
    },

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "verified",
        "rejected",
      ],
      default: "pending",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    biometric: {
      enrolled: {
        type: Boolean,
        default: false,
      },

      provider: {
        type: String,
        default: null,
      },

      templateReference: {
        type: String,
        default: null,
      },

      enrolledAt: {
        type: Date,
        default: null,
      },
    },

    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Resident",
  residentSchema
);