const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

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
|--------------------------------------------------------------------------
| TA-HOSS LOG — USER MANAGEMENT ROUTES
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CURRENT USER / PROFILE
|--------------------------------------------------------------------------
*/

/**
 * GET /api/v1/users/me
 * Get currently authenticated user's profile.
 */
router.get("/me", protect, getProfile);

/**
 * PATCH /api/v1/users/me
 * Update currently authenticated user's profile.
 */
router.patch("/me", protect, updateProfile);

/**
 * PATCH /api/v1/users/me/password
 * Change currently authenticated user's password.
 */
router.patch("/me/password", protect, changePassword);

/**
 * DELETE /api/v1/users/me/photo
 * Remove currently authenticated user's profile photo.
 */
router.delete("/me/photo", protect, removeProfilePhoto);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN — USER MANAGEMENT
|--------------------------------------------------------------------------
*/

/**
 * GET /api/v1/users
 * Get all system users.
 */
router.get("/", protect, authorize(ROLES.SUPER_ADMIN), getUsers);

/**
 * GET /api/v1/users/:id
 * Get a specific user by ID.
 */
router.get("/:id", protect, authorize(ROLES.SUPER_ADMIN), getUserById);

/**
 * POST /api/v1/users
 * Create a new user.
 */
router.post("/", protect, authorize(ROLES.SUPER_ADMIN), createUser);

/**
 * PATCH /api/v1/users/:id
 * Edit user details (name, role).
 */
router.patch("/:id", protect, authorize(ROLES.SUPER_ADMIN), updateUser);

/*
|--------------------------------------------------------------------------
| USER STATUS
|--------------------------------------------------------------------------
*/

/**
 * PATCH /api/v1/users/:id/status
 * General status update (e.g. { "status": "active" } or { "status": "suspended" }).
 */
router.patch("/:id/status", protect, authorize(ROLES.SUPER_ADMIN), updateUserStatus);

/**
 * PATCH /api/v1/users/:id/suspend
 * Suspend a user.
 */
router.patch("/:id/suspend", protect, authorize(ROLES.SUPER_ADMIN), suspendUser);

/**
 * PATCH /api/v1/users/:id/activate
 * Reactivate a suspended/inactive user.
 */
router.patch("/:id/activate", protect, authorize(ROLES.SUPER_ADMIN), activateUser);

/*
|--------------------------------------------------------------------------
| PASSWORD MANAGEMENT
|--------------------------------------------------------------------------
*/

/**
 * PATCH /api/v1/users/:id/password
 * Super Admin changes another user's password administratively.
 */
router.patch("/:id/password", protect, authorize(ROLES.SUPER_ADMIN), changeUserPassword);

/*
|--------------------------------------------------------------------------
| USER PHOTO MANAGEMENT
|--------------------------------------------------------------------------
*/

/**
 * POST /api/v1/users/:id/photo
 * Upload/replace a target user's profile photo.
 */
router.post("/:id/photo", protect, authorize(ROLES.SUPER_ADMIN), uploadUserPhoto);

/**
 * DELETE /api/v1/users/:id/photo
 * Remove a user's profile photo.
 */
router.delete("/:id/photo", protect, authorize(ROLES.SUPER_ADMIN), removeUserPhoto);

/*
|--------------------------------------------------------------------------
| DELETE USER
|--------------------------------------------------------------------------
*/

/**
 * DELETE /api/v1/users/:id
 * Soft delete a user account.
 */
router.delete("/:id", protect, authorize(ROLES.SUPER_ADMIN), deleteUser);

module.exports = router;