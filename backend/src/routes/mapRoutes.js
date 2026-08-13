const express = require("express");

const router = express.Router();

const {
  getHouseholdMapMarkers,
} = require("../controllers/mapController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const ROLES = require("../config/roles");

router.get(
  "/households",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getHouseholdMapMarkers
);

module.exports = router;