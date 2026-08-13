const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");
const validateCreateResident = require("../validators/residentValidator");

// Import controllers with fallback checks to prevent server crash
const residentController = require("../controllers/residentController");

const createResident =
  residentController.createResident ||
  ((req, res) => res.status(501).json({ message: "createResident not implemented" }));

const getResidents =
  residentController.getResidents ||
  ((req, res) => res.status(501).json({ message: "getResidents not implemented" }));

const getResidentById =
  residentController.getResidentById ||
  ((req, res) => res.status(501).json({ message: "getResidentById not implemented" }));

const updateResident =
  residentController.updateResident ||
  ((req, res) => res.status(501).json({ message: "updateResident not implemented" }));

const exportResidentsExcel =
  residentController.exportResidentsExcel ||
  residentController.exportExcel ||
  ((req, res) => res.status(501).json({ message: "exportResidentsExcel not implemented" }));

const exportResidentsPDF =
  residentController.exportResidentsPDF ||
  residentController.exportPDF ||
  ((req, res) => res.status(501).json({ message: "exportResidentsPDF not implemented" }));

// Helper function to safely mount middleware arrays or functions
const safeMiddleware = (middleware) => (Array.isArray(middleware) ? middleware : [middleware]);

// =========================================================
// CREATE RESIDENT
// =========================================================
router.post(
  "/",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.REGISTRATION_OFFICER),
  ...safeMiddleware(validateCreateResident),
  createResident
);

// =========================================================
// EXPORT RESIDENTS - EXCEL (Supports multiple route conventions)
// =========================================================
const exportExcelHandlers = [
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  exportResidentsExcel,
];

router.get("/export/excel", ...exportExcelHandlers);
router.get("/exports/excel", ...exportExcelHandlers);
router.get("/exports/residents/excel", ...exportExcelHandlers);
router.get("/residents/excel", ...exportExcelHandlers);

// =========================================================
// EXPORT RESIDENTS - PDF (Supports multiple route conventions)
// =========================================================
const exportPDFHandlers = [
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  exportResidentsPDF,
];

router.get("/export/pdf", ...exportPDFHandlers);
router.get("/exports/pdf", ...exportPDFHandlers);
router.get("/exports/residents/pdf", ...exportPDFHandlers);
router.get("/residents/pdf", ...exportPDFHandlers);

// =========================================================
// GET ALL RESIDENTS
// =========================================================
router.get(
  "/",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getResidents
);

// =========================================================
// GET SINGLE RESIDENT
// =========================================================
router.get(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getResidentById
);

// =========================================================
// UPDATE RESIDENT
// =========================================================
router.patch(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.REGISTRATION_OFFICER),
  updateResident
);

module.exports = router;