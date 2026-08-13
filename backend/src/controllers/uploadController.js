const cloudinary = require("../config/cloudinary");

/*
 * =========================================================
 * CLOUDINARY UPLOAD HELPER
 * =========================================================
 */

const uploadBufferToCloudinary = (
  buffer,
  options = {}
) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          ...options,
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(uploadResult);
        }
      );

    uploadStream.end(buffer);
  });
};

/*
 * =========================================================
 * RESIDENT PHOTO UPLOAD
 * =========================================================
 */

const uploadResidentPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a resident photo.",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to read the uploaded photo.",
      });
    }

    const result =
      await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: "ta-hoss-log/residents",

          transformation: [
            {
              width: 1000,
              height: 1000,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Resident photo uploaded successfully.",

      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error(
      "RESIDENT PHOTO UPLOAD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload resident photo.",
    });
  }
};

/*
 * =========================================================
 * USER / ADMINISTRATOR PHOTO UPLOAD
 * =========================================================
 */

const uploadUserPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile photo.",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to read the uploaded photo.",
      });
    }

    const result =
      await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: "ta-hoss-log/users",

          transformation: [
            {
              width: 1000,
              height: 1000,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Profile photo uploaded successfully.",

      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error(
      "USER PHOTO UPLOAD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload profile photo.",
    });
  }
};

/*
 * =========================================================
 * DELETE CLOUDINARY PHOTO
 * =========================================================
 *
 * This is kept generic so it can be used for:
 *
 * - Resident photos
 * - User photos
 *
 * =========================================================
 */

const deleteUploadedPhoto = async (
  req,
  res
) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message:
          "Photo public ID is required.",
      });
    }

    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "image",
      }
    );

    return res.json({
      success: true,
      message:
        "Photo deleted successfully.",
    });
  } catch (error) {
    console.error(
      "PHOTO DELETE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete photo.",
    });
  }
};

module.exports = {
  uploadResidentPhoto,
  uploadUserPhoto,
  deleteUploadedPhoto,
};