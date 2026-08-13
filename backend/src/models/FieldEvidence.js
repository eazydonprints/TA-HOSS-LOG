const mongoose = require("mongoose");

const fieldEvidenceSchema = new mongoose.Schema(
  {
    evidenceId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    operation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldOperation",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["gps", "photo", "note", "document"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },

    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },

    fileName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    mimeType: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    fileSize: {
      type: Number,
      default: null,
      min: 0,
    },

    location: {
      latitude: {
        type: Number,
        default: null,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180,
      },

      accuracy: {
        type: Number,
        default: null,
        min: 0,
      },
    },

    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Generate human-readable evidence ID.
 *
 * Example:
 * EVD-20260812-A7K92P
 */
fieldEvidenceSchema.pre("save", async function (next) {
  try {
    if (!this.evidenceId) {
      const stamp = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const suffix = Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase();

      this.evidenceId = `EVD-${stamp}-${suffix}`;
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Frequently used indexes.
 */
fieldEvidenceSchema.index({
  operation: 1,
  capturedAt: -1,
});

fieldEvidenceSchema.index({
  operation: 1,
  type: 1,
  capturedAt: -1,
});

fieldEvidenceSchema.index({
  type: 1,
  capturedAt: -1,
});

fieldEvidenceSchema.index({
  capturedBy: 1,
  capturedAt: -1,
});

module.exports = mongoose.model(
  "FieldEvidence",
  fieldEvidenceSchema
);