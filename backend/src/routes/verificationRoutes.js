const express = require("express");

const router =
  express.Router();

const protect =
  require("../middleware/authMiddleware");

const authorize =
  require("../middleware/roleMiddleware");

const ROLES =
  require("../config/roles");

const {
  verifyResident,
  rejectResident,
  getPendingResidents,
} =
  require(
    "../controllers/verificationController"
  );

/*
=========================================================
PENDING VERIFICATION
=========================================================
*/

router.get(
  "/pending",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.VERIFICATION_OFFICER
  ),

  getPendingResidents
);

/*
=========================================================
VERIFY RESIDENT
=========================================================
*/

router.patch(
  "/:id/verify",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.VERIFICATION_OFFICER
  ),

  verifyResident
);

/*
=========================================================
REJECT RESIDENT
=========================================================
*/

router.patch(
  "/:id/reject",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.VERIFICATION_OFFICER
  ),

  rejectResident
);

module.exports = router;