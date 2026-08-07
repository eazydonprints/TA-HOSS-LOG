const express = require("express");

const router = express.Router();

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
  require("../controllers/verificationController");


router.get(
  "/pending",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.VERIFICATION_OFFICER
  ),
  getPendingResidents
);


router.patch(
  "/:id/verify",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.VERIFICATION_OFFICER
  ),
  verifyResident
);


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