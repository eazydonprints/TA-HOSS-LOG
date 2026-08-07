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
    authorize("Super Admin"),
    getDashboard
);

module.exports = router;