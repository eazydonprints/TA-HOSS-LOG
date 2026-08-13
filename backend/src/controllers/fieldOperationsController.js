const mongoose = require("mongoose");
const FieldOperation = require("../models/FieldOperation");
const User = require("../models/User");

const TYPES = new Set(["gps_mapping", "resident_verification", "gps_recapture", "household_review", "follow_up"]);
const STATUSES = new Set(["planned", "assigned", "in_progress", "completed", "cancelled", "overdue"]);
const PRIORITIES = new Set(["low", "medium", "high", "critical"]);

const getActor = (req) => req.user?._id || req.user?.id || null;
const validObjectId = (value) => value && mongoose.Types.ObjectId.isValid(value);

const serialize = (item) => ({
  ...item.toObject(),
  operationId: item.operationId,
  type: item.type,
  status: item.status,
  priority: item.priority,
  assignedOfficer: item.assignedOfficer
    ? {
        _id: item.assignedOfficer._id,
        name: item.assignedOfficer.fullName || item.assignedOfficer.name || item.assignedOfficer.username,
        username: item.assignedOfficer.username,
        role: item.assignedOfficer.role,
      }
    : null,
});

exports.list = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && STATUSES.has(req.query.status)) query.status = req.query.status;
    if (req.query.priority && PRIORITIES.has(req.query.priority)) query.priority = req.query.priority;
    if (req.query.assignedOfficer && validObjectId(req.query.assignedOfficer)) query.assignedOfficer = req.query.assignedOfficer;

    const operations = await FieldOperation.find(query)
      .populate("assignedOfficer", "username fullName name role")
      .populate("household", "householdId compound houseNumber community location")
      .populate("resident", "firstName middleName lastName residentId")
      .sort({ status: 1, priority: -1, scheduledDate: 1, createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 100, 250))
      .lean();

    res.json({ success: true, data: operations });
  } catch (error) {
    console.error("FIELD OPERATIONS LIST ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load field operations." });
  }
};

exports.summary = async (req, res) => {
  try {
    const [total, planned, assigned, inProgress, completed, cancelled, overdue, highPriority] = await Promise.all([
      FieldOperation.countDocuments(),
      FieldOperation.countDocuments({ status: "planned" }),
      FieldOperation.countDocuments({ status: "assigned" }),
      FieldOperation.countDocuments({ status: "in_progress" }),
      FieldOperation.countDocuments({ status: "completed" }),
      FieldOperation.countDocuments({ status: "cancelled" }),
      FieldOperation.countDocuments({ status: "overdue" }),
      FieldOperation.countDocuments({ priority: { $in: ["high", "critical"] }, status: { $nin: ["completed", "cancelled"] } }),
    ]);
    res.json({ success: true, data: { total, planned, assigned, inProgress, completed, cancelled, overdue, highPriority } });
  } catch (error) {
    console.error("FIELD OPERATIONS SUMMARY ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load field operations summary." });
  }
};

exports.officers = async (req, res) => {
  try {
    const officers = await User.find({ role: { $in: ["registration_officer", "verification_officer", "field_officer", "admin", "super_admin"] } })
      .select("username fullName name role status")
      .sort({ fullName: 1, username: 1 })
      .lean();
    res.json({ success: true, data: officers });
  } catch (error) {
    console.error("FIELD OFFICERS ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to load field officers." });
  }
};

exports.create = async (req, res) => {
  try {
    const { type, title, priority, status, household, resident, targetLabel, location, assignedOfficer, scheduledDate, notes, source } = req.body;
    if (!TYPES.has(type)) return res.status(400).json({ success: false, message: "Invalid field operation type." });
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Operation title is required." });
    if (priority && !PRIORITIES.has(priority)) return res.status(400).json({ success: false, message: "Invalid priority." });
    if (status && !STATUSES.has(status)) return res.status(400).json({ success: false, message: "Invalid status." });
    if (household && !validObjectId(household)) return res.status(400).json({ success: false, message: "Invalid household reference." });
    if (resident && !validObjectId(resident)) return res.status(400).json({ success: false, message: "Invalid resident reference." });
    if (assignedOfficer && !validObjectId(assignedOfficer)) return res.status(400).json({ success: false, message: "Invalid officer reference." });

    const operation = await FieldOperation.create({
      type, title: title.trim(), priority: priority || "medium", status: status || (assignedOfficer ? "assigned" : "planned"),
      household: household || null, resident: resident || null, targetLabel: targetLabel || "", location: location || {},
      assignedOfficer: assignedOfficer || null, scheduledDate: scheduledDate || null, notes: notes || "",
      source: source || "manual", createdBy: getActor(req), updatedBy: getActor(req),
    });

    await operation.populate("assignedOfficer", "username fullName name role");
    res.status(201).json({ success: true, data: serialize(operation) });
  } catch (error) {
    console.error("FIELD OPERATION CREATE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to create field operation." });
  }
};

exports.update = async (req, res) => {
  try {
    const operation = await FieldOperation.findById(req.params.id);
    if (!operation) return res.status(404).json({ success: false, message: "Field operation not found." });

    const allowed = ["title", "type", "priority", "status", "household", "resident", "targetLabel", "location", "assignedOfficer", "scheduledDate", "notes", "completionNotes"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) operation[key] = req.body[key];
    });
    if (operation.type && !TYPES.has(operation.type)) return res.status(400).json({ success: false, message: "Invalid operation type." });
    if (operation.priority && !PRIORITIES.has(operation.priority)) return res.status(400).json({ success: false, message: "Invalid priority." });
    if (operation.status && !STATUSES.has(operation.status)) return res.status(400).json({ success: false, message: "Invalid status." });

    if (operation.status === "assigned" && !operation.assignedOfficer) return res.status(400).json({ success: false, message: "Assign an officer before setting status to assigned." });
    if (operation.status === "in_progress" && !operation.startedAt) operation.startedAt = new Date();
    if (operation.status === "completed" && !operation.completedAt) operation.completedAt = new Date();
    if (operation.status !== "completed") operation.completedAt = operation.status === "cancelled" ? operation.completedAt : null;
    operation.updatedBy = getActor(req);
    await operation.save();
    await operation.populate("assignedOfficer", "username fullName name role");
    res.json({ success: true, data: serialize(operation) });
  } catch (error) {
    console.error("FIELD OPERATION UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update field operation." });
  }
};

exports.start = async (req, res) => {
  req.body = { status: "in_progress" };
  return exports.update(req, res);
};

exports.complete = async (req, res) => {
  req.body = { status: "completed", completionNotes: req.body?.completionNotes || "" };
  const originalUpdate = exports.update;
  return originalUpdate(req, res);
};