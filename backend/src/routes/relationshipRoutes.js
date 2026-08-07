const express = require("express");

const router = express.Router();

const protect =
  require("../middleware/authMiddleware");

const authorize =
  require("../middleware/roleMiddleware");

const ROLES =
  require("../config/roles");

const {
  createRelationship,
  getResidentRelationships,
} =
  require("../controllers/relationshipController");


router.post(
  "/:id",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  createRelationship
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
  getResidentRelationships
);


module.exports = router;