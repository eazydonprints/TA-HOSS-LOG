const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const ROLES = require("../config/roles");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  changePassword,
  getProfile,
} = require("../controllers/userController");


router.get(
  "/profile",
  protect,
  getProfile
);


router.post(
  "/",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  createUser
);


router.get(
  "/",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  getUsers
);


router.get(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  getUserById
);


router.patch(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  updateUser
);


router.patch(
  "/:id/status",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  toggleUserStatus
);

router.patch(
  "/change-password",
  protect,
  changePassword
);

router.delete(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  deleteUser
);

module.exports = router;