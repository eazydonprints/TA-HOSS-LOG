const express = require("express");

const { protect, authorize } = require("../middleware/authMiddleware");
const { getOverview } = require("../controllers/analyticsController");

const router = express.Router();

router.get(
  "/overview",
  protect,
  authorize("super_admin", "registration_officer", "verification_officer", "viewer"),
  getOverview
);

module.exports = router;