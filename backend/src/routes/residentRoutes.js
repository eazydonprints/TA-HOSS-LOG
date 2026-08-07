const express = require("express");

const router = express.Router();

const protect =
  require("../middleware/authMiddleware");

const authorize =
  require("../middleware/roleMiddleware");

const ROLES =
  require("../config/roles");

const validateCreateResident =
  require("../validators/residentValidator");

const {
  createResident,
  getResidents,
  getResidentById,
  updateResident,
} =
  require("../controllers/residentController");


router.post(
  "/",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  validateCreateResident,
  createResident
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
  getResidents
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
  getResidentById
);


router.patch(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  updateResident
);


module.exports = router;