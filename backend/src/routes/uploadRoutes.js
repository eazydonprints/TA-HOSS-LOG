const express = require("express");

const multer = require("multer");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const authorize = require("../middleware/roleMiddleware");

const ROLES = require("../config/roles");

const {
  uploadResidentPhoto,
  uploadUserPhoto,
  deleteUploadedPhoto,
} = require("../controllers/uploadController");

/*
 * =========================================================
 * MULTER CONFIGURATION
 * =========================================================
 */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.mimetype
      )
    ) {
      return callback(
        new Error(
          "Only JPG, PNG and WEBP images are allowed."
        )
      );
    }

    callback(null, true);
  },
});

/*
 * =========================================================
 * RESIDENT PHOTO
 * =========================================================
 *
 * POST
 * /api/v1/upload/resident-photo
 *
 * Registration Officers and Super Admins
 * can upload resident photos.
 *
 * =========================================================
 */

router.post(
  "/resident-photo",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),

  upload.single("photo"),

  uploadResidentPhoto
);

/*
 * =========================================================
 * USER PROFILE PHOTO
 * =========================================================
 *
 * POST
 * /api/v1/upload/user-photo
 *
 * Any authenticated user can upload
 * their own profile photo.
 *
 * =========================================================
 */

router.post(
  "/user-photo",

  protect,

  upload.single("photo"),

  uploadUserPhoto
);

/*
 * =========================================================
 * DELETE CLOUDINARY PHOTO
 * =========================================================
 *
 * This endpoint should not be exposed
 * as an unrestricted public delete route.
 *
 * The user controller will handle deleting
 * photos associated with user accounts.
 *
 * Resident deletion can similarly be handled
 * by the resident controller.
 *
 * =========================================================
 */

router.delete(
  "/photo",

  protect,

  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),

  deleteUploadedPhoto
);

module.exports = router;