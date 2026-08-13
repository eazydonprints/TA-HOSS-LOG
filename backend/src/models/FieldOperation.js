const mongoose = require("mongoose");

const fieldOperationSchema = new mongoose.Schema(
  {
    operationId: { type: String, unique: true, index: true },
    type: {
      type: String,
      enum: ["gps_mapping", "resident_verification", "gps_recapture", "household_review", "follow_up"],
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    status: {
      type: String,
      enum: ["planned", "assigned", "in_progress", "completed", "cancelled", "overdue"],
      default: "planned",
      index: true,
    },
    household: { type: mongoose.Schema.Types.ObjectId, ref: "Household", default: null, index: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "Resident", default: null, index: true },
    targetLabel: { type: String, trim: true, default: "" },
    location: {
      community: { type: String, trim: true, default: "Ta-hoss" },
      compound: { type: String, trim: true, default: "" },
      houseNumber: { type: String, trim: true, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    scheduledDate: { type: Date, default: null, index: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    completionNotes: { type: String, trim: true, default: "" },
    evidence: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      capturedAt: { type: Date, default: null },
    },
    source: { type: String, enum: ["manual", "analytics", "spatial_intelligence"], default: "manual" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

fieldOperationSchema.pre("save", async function (next) {
  if (!this.operationId) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    this.operationId = `FOP-${stamp}-${suffix}`;
  }
  next();
});

fieldOperationSchema.index({ status: 1, priority: -1, scheduledDate: 1 });
fieldOperationSchema.index({ assignedOfficer: 1, status: 1, scheduledDate: 1 });

module.exports = mongoose.model("FieldOperation", fieldOperationSchema);