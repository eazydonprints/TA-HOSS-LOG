const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const ROLES = require("../config/roles");

const {
  exportResidentsExcel,
  exportResidentsPDF,
} = require("../controllers/exportController");


/*
 * =========================================================
 * TA-HOSS LOG — RESIDENT EXPORT ROUTES
 * =========================================================
 *
 * All export operations require authentication.
 *
 * SUPER ADMIN
 * - Excel
 * - PDF
 *
 * REGISTRATION OFFICER
 * - Excel
 * - PDF
 *
 * VERIFICATION OFFICER
 * - Excel
 * - PDF
 *
 * VIEWER
 * - No export permission
 *
 * =========================================================
 */


/*
 * =========================================================
 * EXCEL EXPORT
 * =========================================================
 *
 * GET
 * /api/v1/exports/residents/excel
 *
 * Optional query parameters:
 *
 * ?search=
 * ?verificationStatus=
 * ?identityStatus=
 * ?status=
 * ?gender=
 * ?household=
 *
 * Example:
 *
 * /api/v1/exports/residents/excel?gender=male
 *
 * =========================================================
 */

router.get(
  "/residents/excel",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER
  ),

  exportResidentsExcel
);


/*
 * =========================================================
 * PDF EXPORT
 * =========================================================
 *
 * GET
 * /api/v1/exports/residents/pdf
 *
 * Supports the same filters as Excel.
 *
 * Example:
 *
 * /api/v1/exports/residents/pdf?status=active
 *
 * =========================================================
 */

router.get(
  "/residents/pdf",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER
  ),

  exportResidentsPDF
);


module.exports = router;