const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const validateCreateUser = require("../validators/userValidator");

const {
    createUser,
    getUsers,
    getProfile
} = require("../controllers/userController");

router.get("/profile", protect, getProfile);

router.post(
    "/",
    protect,
    authorize("super_admin"),
    validateCreateUser,
    createUser
);

router.get(
    "/",
    protect,
    authorize("super_admin"),
    getUsers
);

module.exports = router;