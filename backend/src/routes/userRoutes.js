const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");
const upload = require("../middleware/uploadMiddleware");

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  suspendUser,
  activateUser,
  changeUserPassword,
  deleteUser,
  uploadUserPhoto,
  removeUserPhoto,
  getProfile,
  updateProfile,
  changePassword,
  removeProfilePhoto,
} = require("../controllers/userController");

/*
|------------------------------------------------------------------
| CURRENT USER / PROFILE
|------------------------------------------------------------------
*/

router.get("/me", protect, getProfile);

router.patch(
  "/me",
  protect,
  updateProfile
);

router.patch(
  "/me/password",
  protect,
  changePassword
);

router.delete(
  "/me/photo",
  protect,
  removeProfilePhoto
);

/*
|------------------------------------------------------------------
| SUPER ADMIN — USER MANAGEMENT
|------------------------------------------------------------------
*/

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

router.post(
  "/",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  createUser
);

router.patch(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  updateUser
);

/*
|------------------------------------------------------------------
| USER STATUS
|------------------------------------------------------------------
*/

router.patch(
  "/:id/status",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  updateUserStatus
);

router.patch(
  "/:id/suspend",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  suspendUser
);

router.patch(
  "/:id/activate",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  activateUser
);

/*
|------------------------------------------------------------------
| PASSWORD MANAGEMENT
|------------------------------------------------------------------
*/

router.patch(
  "/:id/password",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  changeUserPassword
);

/*
|--------------------------------------------------------------------------
| USER PHOTO MANAGEMENT
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/photo",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  upload.single("photo"),
  uploadUserPhoto
);

router.delete(
  "/:id/photo",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  removeUserPhoto
);

/*
|------------------------------------------------------------------
| DELETE USER
|------------------------------------------------------------------
*/

router.delete(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN),
  deleteUser
);

module.exports = router;