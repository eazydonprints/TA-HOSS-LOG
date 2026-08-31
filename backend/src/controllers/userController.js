const bcrypt = require("bcryptjs");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const getPagination = require("../utils/pagination");

/*
 * =========================================================
 * CONSTANTS & HELPERS
 * =========================================================
 */
const ALLOWED_ROLES = [
  "super_admin",
  "registration_officer",
  "verification_officer",
  "viewer",
];

const isValidRole = (role) => ALLOWED_ROLES.includes(role);
const normalizeUsername = (username) => String(username || "").trim().toLowerCase();
const normalizeFullname = (fullname) => String(fullname || "").trim();

const formatUserResponse = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    fullname: user.fullname,
    username: user.username,
    role: user.role,
    photo: user.photo || null,
    photoPublicId: user.photoPublicId || null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt || null,
  };
};

const isSameUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  return currentUser._id.toString() === targetUser._id.toString();
};

const deleteCloudinaryPhoto = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("CLOUDINARY PHOTO DELETE ERROR:", error);
  }
};

/*
 * =========================================================
 * CLOUDINARY BUFFER UPLOAD HELPER
 * =========================================================
 */
const uploadBufferToCloudinary = (buffer, folder = "ta-hoss/users") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          {
            width: 800,
            height: 800,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/*
 * =========================================================
 * CREATE USER
 * =========================================================
 */
const createUser = async (req, res) => {
  try {
    const { fullname, username, password, role } = req.body || {};

    if (!fullname || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Full name, username, password and role are required.",
      });
    }

    const normalizedFullname = normalizeFullname(fullname);
    const normalizedUsername = normalizeUsername(username);

    if (normalizedFullname.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must contain at least 2 characters.",
      });
    }

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must contain at least 3 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid administrator role.",
        allowedRoles: ALLOWED_ROLES,
      });
    }

    const existingUser = await User.findOne({
      username: normalizedUsername,
      deletedAt: null,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullname: normalizedFullname,
      username: normalizedUsername,
      password: hashedPassword,
      role,
      isActive: true,
      photo: null,
      photoPublicId: null,
    });

    return res.status(201).json({
      success: true,
      message: "Administrator created successfully.",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to create administrator.",
    });
  }
};

/*
 * =========================================================
 * GET USERS
 * =========================================================
 */
const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = req.query.search?.trim();
    const role = req.query.role?.trim();
    const isActive = req.query.isActive;

    const filter = { deletedAt: null };

    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter.",
        });
      }
      filter.role = role;
    }

    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: users.map(formatUserResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load administrators.",
    });
  }
};

/*
 * =========================================================
 * GET USER BY ID
 * =========================================================
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    return res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("GET USER BY ID ERROR:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid administrator ID.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to load administrator.",
    });
  }
};

/*
 * =========================================================
 * UPDATE USER
 * =========================================================
 */
const updateUser = async (req, res) => {
  try {
    const { fullname, role } = req.body || {};

    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    if (fullname !== undefined) {
      const normalizedFullname = normalizeFullname(fullname);
      if (normalizedFullname.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Full name must contain at least 2 characters.",
        });
      }
      user.fullname = normalizedFullname;
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid administrator role.",
        });
      }

      if (
        isSameUser(req.user, user) &&
        req.user.role === "super_admin" &&
        role !== "super_admin"
      ) {
        return res.status(400).json({
          success: false,
          message: "You cannot remove your own Super Admin role.",
        });
      }

      user.role = role;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Administrator updated successfully.",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update administrator.",
    });
  }
};

/*
 * =========================================================
 * STATUS MANAGEMENT
 * =========================================================
 */

/*
 * ---------------------------------------------------------
 * UPDATE USER STATUS
 *
 * Supported statuses:
 *   active
 *   suspended
 *   inactive
 *
 * User model uses isActive as the source of truth.
 * ---------------------------------------------------------
 */

const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;

    const requestedStatus = String(
      req.body?.status || ""
    )
      .trim()
      .toLowerCase();

    const allowedStatuses = [
      "active",
      "suspended",
      "inactive",
    ];

    if (
      !allowedStatuses.includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or missing status. Allowed values: active, suspended, inactive.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "Administrator ID is required.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    /*
     * Never allow an administrator to
     * suspend/deactivate their own account.
     */

    const shouldActivate =
      requestedStatus === "active";

    if (
      isSameUser(req.user, user) &&
      !shouldActivate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot suspend or deactivate your own account.",
      });
    }

    /*
     * "active" = true
     * "suspended" / "inactive" = false
     */

    user.isActive = shouldActivate;

    await user.save();

    const updatedUser =
      await User.findById(user._id)
        .select("-password")
        .lean();

    return res.json({
      success: true,

      message: shouldActivate
        ? "Administrator activated successfully."
        : "Administrator suspended successfully.",

      data:
        formatUserResponse(
          updatedUser
        ),
    });

  } catch (error) {
    console.error(
      "UPDATE USER STATUS ERROR:",
      error
    );

    console.error(
      "UPDATE USER STATUS ERROR DETAILS:",
      {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        path: error?.path,
        value: error?.value,
      }
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update status.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};


/*
 * ---------------------------------------------------------
 * SUSPEND USER
 * ---------------------------------------------------------
 */

const suspendUser = async (
  req,
  res
) => {
  req.body = {
    ...(req.body || {}),
    status: "suspended",
  };

  return updateUserStatus(
    req,
    res
  );
};


/*
 * ---------------------------------------------------------
 * ACTIVATE USER
 * ---------------------------------------------------------
 */

const activateUser = async (
  req,
  res
) => {
  req.body = {
    ...(req.body || {}),
    status: "active",
  };

  return updateUserStatus(
    req,
    res
  );
};


/*
 * ---------------------------------------------------------
 * TOGGLE USER STATUS
 * ---------------------------------------------------------
 */

const toggleUserStatus = async (
  req,
  res
) => {
  try {
    const userId =
      req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "Administrator ID is required.",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        deletedAt: null,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });
    }

    if (
      isSameUser(
        req.user,
        user
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot suspend or deactivate your own account.",
      });
    }

    user.isActive =
      !Boolean(
        user.isActive
      );

    await user.save();

    const updatedUser =
      await User.findById(
        user._id
      )
        .select("-password")
        .lean();

    return res.json({
      success: true,

      message:
        updatedUser.isActive
          ? "Administrator activated successfully."
          : "Administrator suspended successfully.",

      data:
        formatUserResponse(
          updatedUser
        ),
    });

  } catch (error) {
    console.error(
      "TOGGLE USER STATUS ERROR:",
      error
    );

    console.error(
      "TOGGLE USER STATUS ERROR DETAILS:",
      {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        path: error?.path,
        value: error?.value,
      }
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change administrator status.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/*
 * =========================================================
 * DELETE USER
 * =========================================================
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    if (isSameUser(req.user, user)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();

    if (user.photoPublicId) {
      await deleteCloudinaryPhoto(user.photoPublicId);
      user.photo = null;
      user.photoPublicId = null;
      await user.save();
    }

    return res.json({
      success: true,
      message: "Administrator deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete administrator.",
    });
  }
};

/*
 * =========================================================
 * CHANGE PASSWORDS
 * =========================================================
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters.",
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match.",
      });
    }

    const user = await User.findOne({
      _id: req.user._id,
      deletedAt: null,
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body || {};

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirmation password do not match.",
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({
      success: true,
      message: "Administrator password changed successfully.",
    });
  } catch (error) {
    console.error("CHANGE USER PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to change administrator password.",
    });
  }
};

/*
 * =========================================================
 * PERSONAL PROFILE MANAGEMENT
 * =========================================================
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      deletedAt: null,
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load profile.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullname, photo, photoPublicId } = req.body || {};

    const user = await User.findOne({
      _id: req.user._id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    if (fullname !== undefined) {
      const normalizedFullname = normalizeFullname(fullname);
      if (normalizedFullname.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Full name must contain at least 2 characters.",
        });
      }
      user.fullname = normalizedFullname;
    }

    if (photo !== undefined || photoPublicId !== undefined) {
      const oldPublicId = user.photoPublicId;
      const newPhoto = photo || null;
      const newPublicId = photoPublicId || null;

      if (oldPublicId && oldPublicId !== newPublicId) {
        await deleteCloudinaryPhoto(oldPublicId);
      }

      user.photo = newPhoto;
      user.photoPublicId = newPublicId;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};

/*
 * =========================================================
 * PHOTO MANAGEMENT
 * =========================================================
 */

const uploadUserPhoto = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    let photoUrl = null;
    let photoPublicId = null;

    /*
     * ---------------------------------------------------------
     * OPTION 1: ACTUAL FILE UPLOAD USING MULTER
     * ---------------------------------------------------------
     */
    if (req.file) {
      const uploadedPhoto = await uploadBufferToCloudinary(
        req.file.buffer,
        "ta-hoss/users"
      );

      photoUrl = uploadedPhoto.secure_url;
      photoPublicId = uploadedPhoto.public_id;
    }

    /*
     * ---------------------------------------------------------
     * OPTION 2: CLOUDINARY URL SENT DIRECTLY
     * ---------------------------------------------------------
     */
    else if (req.body?.photo) {
      photoUrl = req.body.photo;
      photoPublicId = req.body.photoPublicId || null;
    }

    /*
     * ---------------------------------------------------------
     * NO PHOTO
     * ---------------------------------------------------------
     */
    else {
      return res.status(400).json({
        success: false,
        message: "Please select a valid photo to upload.",
      });
    }

    /*
     * ---------------------------------------------------------
     * DELETE OLD CLOUDINARY PHOTO
     * ---------------------------------------------------------
     */
    if (
      user.photoPublicId &&
      user.photoPublicId !== photoPublicId
    ) {
      await deleteCloudinaryPhoto(
        user.photoPublicId
      );
    }

    /*
     * ---------------------------------------------------------
     * SAVE NEW PHOTO
     * ---------------------------------------------------------
     */
    user.photo = photoUrl;
    user.photoPublicId = photoPublicId;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Administrator photo uploaded successfully.",
      data: formatUserResponse(user),
    });

  } catch (error) {
    console.error(
      "UPLOAD USER PHOTO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to upload administrator photo.",
    });
  }
};

/*
 * =========================================================
 * ALIAS
 * =========================================================
 */

const updateUserPhoto = uploadUserPhoto;


/*
 * =========================================================
 * REMOVE USER PHOTO
 * =========================================================
 */

const removeUserPhoto = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
    }

    /*
     * Delete from Cloudinary
     */
    if (user.photoPublicId) {
      await deleteCloudinaryPhoto(
        user.photoPublicId
      );
    }

    /*
     * Remove from database
     */
    user.photo = null;
    user.photoPublicId = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Administrator photo removed successfully.",
      data: formatUserResponse(user),
    });

  } catch (error) {
    console.error(
      "REMOVE USER PHOTO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to remove administrator photo.",
    });
  }
};


/*
 * =========================================================
 * REMOVE CURRENT USER PROFILE PHOTO
 * =========================================================
 */

const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      deletedAt: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    /*
     * Delete old Cloudinary image
     */
    if (user.photoPublicId) {
      await deleteCloudinaryPhoto(
        user.photoPublicId
      );
    }

    user.photo = null;
    user.photoPublicId = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo removed successfully.",
      data: formatUserResponse(user),
    });

  } catch (error) {
    console.error(
      "REMOVE PROFILE PHOTO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to remove profile photo.",
    });
  }
};

/*
 * =========================================================
 * EXPORTS
 * =========================================================
 */
module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  suspendUser,
  activateUser,
  deleteUser,
  changePassword,
  changeUserPassword,
  getProfile,
  updateProfile,
  uploadUserPhoto,
  updateUserPhoto,
  removeUserPhoto,
  removeProfilePhoto,
};