const mongoose = require("mongoose");

const householdSchema = new mongoose.Schema(
  {
    householdId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    community: {
      type: String,
      default: "Ta-hoss",
      immutable: true,
    },

    lga: {
      type: String,
      default: "Riyom",
      immutable: true,
    },

    state: {
      type: String,
      default: "Plateau",
      immutable: true,
    },

    country: {
      type: String,
      default: "Nigeria",
      immutable: true,
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
    },

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
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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

module.exports = mongoose.model("Household", householdSchema);