const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const ROLES = require("../config/roles");

const {
  createHousehold,
  getHouseholds,
  getHouseholdById,
  updateHousehold,
  updateHouseholdGPS,
  deleteHousehold,
  getHouseholdTree,
} = require("../controllers/householdController");

const {
  validateCreateHousehold,
  validateGPS,
} = require("../validators/householdValidator");


router.post(
  "/",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  validateCreateHousehold,
  validateGPS,
  createHousehold
);


router.get(
  "/",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getHouseholds
);

router.get(
  "/:id/tree",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getHouseholdTree
);

router.get(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getHouseholdById
);


router.patch(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  updateHousehold
);


router.patch(
  "/:id/gps",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  validateGPS,
  updateHouseholdGPS
);


router.delete(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  deleteHousehold
);


module.exports = router;