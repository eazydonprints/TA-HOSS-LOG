const bcrypt = require("bcryptjs");

const User = require("../models/User");
const getPagination = require("../utils/pagination");

const createUser = async (req, res) => {
  const { fullname, username, password, role } = req.body;

  if (!fullname || !username || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Full name, username, password and role are required.",
    });
  }

  const existingUser = await User.findOne({
    username: username.toLowerCase(),
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
    fullname,
    username: username.toLowerCase(),
    password: hashedPassword,
    role,
  });

  return res.status(201).json({
    success: true,
    message: "Administrator created successfully.",
    data: {
      id: user._id,
      fullname: user.fullname,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
};


const getUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const search = req.query.search?.trim();

  const filter = {
    deletedAt: null,
  };

  if (search) {
    filter.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    User.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};


const getUserById = async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    deletedAt: null,
  }).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Administrator not found.",
    });
  }

  return res.json({
    success: true,
    data: user,
  });
};


const updateUser = async (req, res) => {
  const { fullname, role } = req.body;

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
    user.fullname = fullname.trim();
  }

  if (role !== undefined) {
    user.role = role;
  }

  await user.save();

  return res.json({
    success: true,
    message: "Administrator updated successfully.",
    data: {
      id: user._id,
      fullname: user.fullname,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    },
  });
};


const toggleUserStatus = async (req, res) => {
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

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot deactivate your own account.",
    });
  }

  user.isActive = !user.isActive;

  await user.save();

  return res.json({
    success: true,
    message: user.isActive
      ? "Administrator activated successfully."
      : "Administrator deactivated successfully.",
    data: {
      id: user._id,
      isActive: user.isActive,
    },
  });
};


const deleteUser = async (req, res) => {
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

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account.",
    });
  }

  user.deletedAt = new Date();
  user.isActive = false;

  await user.save();

  return res.json({
    success: true,
    message: "Administrator deleted successfully.",
  });
};


const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

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

  const user = await User.findById(req.user._id);

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect.",
    });
  }

  user.password = await bcrypt.hash(newPassword, 12);

  await user.save();

  return res.json({
    success: true,
    message: "Password changed successfully.",
  });
};


const getProfile = async (req, res) => {
  return res.json({
    success: true,
    data: req.user,
  });
};


module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  changePassword,
  getProfile,
};