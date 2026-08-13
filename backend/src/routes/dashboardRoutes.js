const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getDashboard
} = require("../controllers/dashboardController");

router.get(
  "/",
  protect,
  authorize("super_admin"),
  getDashboard
);

module.exports = router;