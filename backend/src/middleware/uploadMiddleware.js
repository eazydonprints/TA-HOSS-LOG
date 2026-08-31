const multer = require("multer");

/*
 * =========================================================
 * MEMORY STORAGE
 *
 * Images are temporarily stored in memory and then uploaded
 * directly to Cloudinary.
 * =========================================================
 */

const storage = multer.memoryStorage();


/*
 * =========================================================
 * FILE FILTER
 * =========================================================
 */

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP image files are allowed."
      )
    );
  }

  cb(null, true);
};


/*
 * =========================================================
 * MULTER CONFIGURATION
 * =========================================================
 */

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

module.exports = upload;