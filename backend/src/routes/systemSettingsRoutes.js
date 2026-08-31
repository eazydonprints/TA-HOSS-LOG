const express = require("express");

const router = express.Router();

const {
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
} = require("../controllers/systemSettingsController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// =========================================================
// SYSTEM SETTINGS ROUTES
// =========================================================

// GET SYSTEM SETTINGS
router.get(
  "/",
  protect,
  getSystemSettings
);

// UPDATE SYSTEM SETTINGS
router.put(
  "/",
  protect,
  authorize("super_admin"),
  updateSystemSettings
);

// RESET SYSTEM SETTINGS TO DEFAULT
router.post(
  "/reset",
  protect,
  authorize("super_admin"),
  resetSystemSettings
);

module.exports = router;