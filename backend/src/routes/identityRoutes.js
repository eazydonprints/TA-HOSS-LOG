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
} =
  require("../controllers/identityController");


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


module.exports = router;