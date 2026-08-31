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
| HOUSEHOLD ACCESS ROLES
|--------------------------------------------------------------------------
*/

const READ_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.REGISTRATION_OFFICER,
  ROLES.VERIFICATION_OFFICER,
  ROLES.VIEWER,
];

const WRITE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.REGISTRATION_OFFICER,
];

/*
|--------------------------------------------------------------------------
| CREATE HOUSEHOLD
| POST /api/v1/households
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  protect,
  authorize(...WRITE_ROLES),
  validateCreateHousehold,
  validateGPS,
  createHousehold
);

/*
|--------------------------------------------------------------------------
| GET ALL HOUSEHOLDS
| GET /api/v1/households
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  authorize(...READ_ROLES),
  getHouseholds
);

/*
|--------------------------------------------------------------------------
| IMPORTANT ROUTE GUARD
|
| This prevents:
|
| GET /api/v1/households/register
|
| from falling through to:
|
| GET /api/v1/households/:id
|
| and causing:
|
| CastError: "register" -> ObjectId
|
| This endpoint should normally never be called by the frontend,
| because /households/register is a React page, not an API resource.
|--------------------------------------------------------------------------
*/

router.get(
  "/register",
  protect,
  authorize(...READ_ROLES),
  (req, res) => {
    return res.status(405).json({
      success: false,
      code: "HOUSEHOLD_REGISTER_GET_NOT_ALLOWED",
      message:
        "Household registration is a frontend page. Use POST /api/v1/households to create a household.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD RELATIONSHIP TREE
| GET /api/v1/households/:id/tree
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/tree",
  protect,
  authorize(...READ_ROLES),
  getHouseholdTree
);

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD GPS
| PATCH /api/v1/households/:id/gps
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/gps",
  protect,
  authorize(...WRITE_ROLES),
  validateGPS,
  updateHouseholdGPS
);

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD BY ID
| GET /api/v1/households/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  authorize(...READ_ROLES),
  getHouseholdById
);

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD
| PATCH /api/v1/households/:id
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  protect,
  authorize(...WRITE_ROLES),
  updateHousehold
);

/*
|--------------------------------------------------------------------------
| DELETE / ARCHIVE HOUSEHOLD
| DELETE /api/v1/households/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  deleteHousehold
);

module.exports = router;