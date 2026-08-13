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

/*
|--------------------------------------------------------------------------
| CREATE HOUSEHOLD
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLDS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD RELATIONSHIP TREE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD GPS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD BY ID
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  updateHousehold
);

/*
|--------------------------------------------------------------------------
| DELETE / ARCHIVE HOUSEHOLD
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN
  ),
  deleteHousehold
);

module.exports = router;