const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Main protect middleware
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      isActive: true,
      deletedAt: null,
    }).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// Role authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized to access this route.",
      });
    }
    next();
  };
};

protect.protect = protect;
protect.authorize = authorize;

module.exports = protect;