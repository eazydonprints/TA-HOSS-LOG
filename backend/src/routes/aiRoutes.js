const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  chat,
  health,
} = require("../controllers/aiController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AI HEALTH
|--------------------------------------------------------------------------
*/

router.get(
  "/health",
  protect,
  health
);

/*
|--------------------------------------------------------------------------
| AI CHAT
|--------------------------------------------------------------------------
*/

router.post(
  "/chat",
  protect,
  chat
);

module.exports = router;