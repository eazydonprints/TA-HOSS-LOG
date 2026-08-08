const express = require("express");

const router = express.Router();

const protect =
  require("../middleware/authMiddleware");

const authorize =
  require("../middleware/roleMiddleware");

const ROLES =
  require("../config/roles");

const {
  generateResidentQR,
  verifyResidentQR,
  getResidentProfile,
} = require("../controllers/identityController");


router.post(
  "/:id/qr",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  generateResidentQR
);


router.get(
  "/verify/:token",
  verifyResidentQR
);

router.get(
  "/:residentId/profile",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getResidentProfile
);

module.exports = router;