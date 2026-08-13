const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/fieldEvidenceController");

/* -------------------------------------------------------------------------- */
/* AUTHENTICATION                                                             */
/* -------------------------------------------------------------------------- */

let protect;

try {
  protect =
    require("../middleware/authMiddleware")
      .protect;
} catch (error) {
  protect =
    require("../middleware/auth")
      .protect;
}

if (
  typeof protect !==
  "function"
) {
  throw new Error(
    "A protect authentication middleware is required for field evidence routes."
  );
}

/* -------------------------------------------------------------------------- */
/* FIELD EVIDENCE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * GET
 * List all evidence belonging to a field operation.
 *
 * /api/v1/field-evidence/:operationId
 */
router.get(
  "/:operationId",
  protect,
  controller.list
);

/**
 * GET
 * Evidence statistics for a field operation.
 *
 * /api/v1/field-evidence/:operationId/summary
 */
router.get(
  "/:operationId/summary",
  protect,
  controller.summary
);

/**
 * POST
 * Create new field evidence.
 *
 * /api/v1/field-evidence/:operationId
 */
router.post(
  "/:operationId",
  protect,
  controller.create
);

/**
 * DELETE
 * Remove an individual evidence record.
 *
 * /api/v1/field-evidence/item/:evidenceId
 */
router.delete(
  "/item/:evidenceId",
  protect,
  controller.remove
);

module.exports = router;