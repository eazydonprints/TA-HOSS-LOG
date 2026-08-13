const mongoose = require("mongoose");

const householdSchema = new mongoose.Schema(
  {
    householdId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    community: {
      type: String,
      default: "Ta-hoss",
      immutable: true,
      trim: true,
    },

    lga: {
      type: String,
      default: "Riyom",
      immutable: true,
      trim: true,
    },

    state: {
      type: String,
      default: "Plateau",
      immutable: true,
      trim: true,
    },

    country: {
      type: String,
      default: "Nigeria",
      immutable: true,
      trim: true,
    },

    compound: {
      type: String,
      trim: true,
    },

    houseNumber: {
      type: String,
      trim: true,
    },

    householdHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      default: null,
      index: true,
    },

    location: {
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

      accuracy: {
        type: Number,
        min: 0,
        default: null,
      },

      altitude: {
        type: Number,
        default: null,
      },

      capturedAt: {
        type: Date,
        default: null,
      },

      captureMethod: {
        type: String,
        enum: [
          "gps",
          "manual",
          "offline_gps",
        ],
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Household",
  householdSchema
);