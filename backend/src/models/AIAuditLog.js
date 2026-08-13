const mongoose = require("mongoose");

const aiAuditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    role: {
      type: String,
      default: null,
      index: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    source: {
      type: String,
      enum: [
        "database",
        "application_knowledge",
        "general_ai",
        "unsupported",
        "error",
      ],
      required: true,
    },

    operation: {
      type: String,
      default: null,
    },

    arguments: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    success: {
      type: Boolean,
      required: true,
    },

    errorType: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiAuditLogSchema.index({
  createdAt: -1,
});

module.exports = mongoose.model(
  "AIAuditLog",
  aiAuditLogSchema
);