const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
 * =========================================================
 * HELPER FUNCTIONS
 * =========================================================
 */

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      accountType: user.accountType,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/*
 * =========================================================
 * PUBLIC USER SIGNUP
 * POST /api/v1/auth/signup
 * =========================================================
 */

exports.signup = async (req, res) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      username,
      email,
      phone,
      password,
      confirmPassword,
      verificationMethod,
    } = req.body;

    /*
     * =====================================================
     * VALIDATE REQUIRED FIELDS
     * =====================================================
     */

    if (!firstname || !lastname || !username || !password) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, username and password are required.",
      });
    }

    /*
     * =====================================================
     * CONFIRM PASSWORD
     * =====================================================
     */

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    /*
     * =====================================================
     * VALIDATE VERIFICATION METHOD
     * =====================================================
     */

    if (
      !verificationMethod ||
      !["email", "phone"].includes(verificationMethod)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please select either email or phone verification.",
      });
    }

    if (
      verificationMethod === "email" &&
      !email
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required for email verification.",
      });
    }

    if (
      verificationMethod === "phone" &&
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required for phone verification.",
      });
    }

    /*
     * =====================================================
     * NORMALIZE DATA
     * =====================================================
     */

    const normalizedFirstName =
      firstname.trim();

    const normalizedMiddleName =
      middlename?.trim() || null;

    const normalizedLastName =
      lastname.trim();

    const normalizedUsername =
      username.trim().toLowerCase();

    const normalizedEmail =
      email
        ? email.trim().toLowerCase()
        : null;

    const normalizedPhone =
      phone
        ? phone.trim()
        : null;

    /*
     * =====================================================
     * BUILD FULL NAME
     * =====================================================
     */

    const fullname = [
      normalizedFirstName,
      normalizedMiddleName,
      normalizedLastName,
    ]
      .filter(Boolean)
      .join(" ");

    /*
     * =====================================================
     * CHECK USERNAME
     * =====================================================
     */

    const existingUsername =
      await User.findOne({
        username: normalizedUsername,
        deletedAt: null,
      });

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message:
          "Username is already taken.",
      });
    }

    /*
     * =====================================================
     * CHECK EMAIL
     * =====================================================
     */

    if (normalizedEmail) {
      const existingEmail =
        await User.findOne({
          email: normalizedEmail,
          deletedAt: null,
        });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message:
            "Email address is already registered.",
        });
      }
    }

    /*
     * =====================================================
     * CHECK PHONE
     * =====================================================
     */

    if (normalizedPhone) {
      const existingPhone =
        await User.findOne({
          phone: normalizedPhone,
          deletedAt: null,
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "Phone number is already registered.",
        });
      }
    }

    /*
     * =====================================================
     * HASH PASSWORD
     * =====================================================
     */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * =====================================================
     * GENERATE OTP
     * =====================================================
     */

    const otp =
      generateOTP();

    const hashedOTP =
      await hashOTP(otp);

    const otpExpiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000
      );

    /*
     * =====================================================
     * CREATE PUBLIC USER
     * =====================================================
     */

    const user =
      await User.create({

        /*
         * NAME
         */

        fullname,

        firstName:
          normalizedFirstName,

        middleName:
          normalizedMiddleName,

        lastName:
          normalizedLastName,

        /*
         * LOGIN DETAILS
         */

        username:
          normalizedUsername,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        password:
          hashedPassword,

        /*
         * ACCOUNT TYPE
         */

        role:
          "public_user",

        accountType:
          "public",

        accountStatus:
          "pending_verification",

        isActive:
          true,

        /*
         * VERIFICATION
         */

        emailVerified:
          false,

        phoneVerified:
          false,

        verificationOTP: {
          hash:
            hashedOTP,

          expiresAt:
            otpExpiresAt,

          attempts:
            0,

          method:
            verificationMethod,
        },
      });

    /*
     * =====================================================
     * DEVELOPMENT OTP
     *
     * Later this will be replaced with:
     *
     * Email Service
     * SMS Service
     * =====================================================
     */

    console.log(
      "================================="
    );

    console.log(
      "PUBLIC ACCOUNT OTP"
    );

    console.log(
      "User:",
      user.username
    );

    console.log(
      "Verification Method:",
      verificationMethod
    );

    console.log(
      "OTP:",
      otp
    );

    console.log(
      "================================="
    );

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return res.status(201).json({
      success: true,

      message:
        `Account created successfully. An OTP has been sent to your ${verificationMethod}.`,

      verificationRequired:
        true,

      userId:
        user._id,

      user: {
        id:
          user._id,

        fullname:
          user.fullname,

        firstName:
          user.firstName,

        middleName:
          user.middleName,

        lastName:
          user.lastName,

        username:
          user.username,

        email:
          user.email,

        phone:
          user.phone,

        verificationMethod,
      },
    });

  } catch (error) {

    console.error(
      "Signup error:",
      error
    );

    /*
     * MONGODB DUPLICATE KEY ERROR
     */

    if (error.code === 11000) {

      const field =
        Object.keys(
          error.keyPattern
        )[0];

      return res.status(409).json({
        success: false,

        message:
          `${field} is already registered.`,
      });
    }

    /*
     * MONGOOSE VALIDATION ERROR
     */

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,

        message:
          Object.values(
            error.errors
          )
            .map(
              (item) =>
                item.message
            )
            .join(", "),
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Unable to create account.",
    });
  }
};

/*
 * =========================================================
 * VERIFY PUBLIC USER ACCOUNT
 * POST /api/v1/auth/verify-account
 * =========================================================
 */
exports.verifyAccount = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    }).select("+verificationOTP.hash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.accountType !== "public") {
      return res.status(403).json({
        success: false,
        message: "This verification endpoint is only for public user accounts.",
      });
    }

    if (user.accountStatus === "active") {
      return res.status(400).json({
        success: false,
        message: "This account has already been verified.",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "This account has been suspended.",
      });
    }

    if (user.accountStatus === "disabled") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "This account has been disabled.",
      });
    }

    if (!user.verificationOTP || !user.verificationOTP.hash) {
      return res.status(400).json({
        success: false,
        message: "No active verification OTP found. Please request a new OTP.",
      });
    }

    if (!user.verificationOTP.expiresAt || user.verificationOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "This OTP has expired. Please request a new OTP.",
      });
    }

    const MAX_OTP_ATTEMPTS = 5;

    if (user.verificationOTP.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        code: "OTP_ATTEMPTS_EXCEEDED",
        message: "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    const isOTPValid = await bcrypt.compare(otp.toString(), user.verificationOTP.hash);

    if (!isOTPValid) {
      user.verificationOTP.attempts += 1;
      await user.save();

      const attemptsRemaining = MAX_OTP_ATTEMPTS - user.verificationOTP.attempts;

      return res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid OTP.",
        attemptsRemaining,
      });
    }

    user.accountStatus = "active";

    if (user.verificationOTP.method === "email") {
      user.emailVerified = true;
    }

    if (user.verificationOTP.method === "phone") {
      user.phoneVerified = true;
    }

    user.verificationOTP.hash = null;
    user.verificationOTP.expiresAt = null;
    user.verificationOTP.attempts = 0;
    user.verificationOTP.method = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account verified successfully. You can now log in.",
      user: {
        id: user._id,
        username: user.username,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    console.error("Account verification error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to verify account.",
    });
  }
};

/*
 * =========================================================
 * RESEND ACCOUNT VERIFICATION OTP
 * POST /api/v1/auth/resend-otp
 * =========================================================
 */
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    }).select("+verificationOTP.hash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.accountType !== "public") {
      return res.status(403).json({
        success: false,
        message: "OTP verification is only available for public accounts.",
      });
    }

    if (user.accountStatus === "active") {
      return res.status(400).json({
        success: false,
        message: "This account has already been verified.",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This account has been suspended.",
      });
    }

    if (user.accountStatus === "disabled") {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled.",
      });
    }

    const verificationMethod = user.verificationOTP.method;

    if (!verificationMethod) {
      return res.status(400).json({
        success: false,
        message: "No verification method found for this account.",
      });
    }

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP.hash = hashedOTP;
    user.verificationOTP.expiresAt = otpExpiresAt;
    user.verificationOTP.attempts = 0;

    await user.save();

    console.log("=================================");
    console.log("RESEND VERIFICATION OTP");
    console.log("User:", user.username);
    console.log("Verification Method:", verificationMethod);
    console.log("NEW OTP:", otp);
    console.log("=================================");

    return res.status(200).json({
      success: true,
      message: `A new OTP has been sent to your ${verificationMethod}.`,
      verificationMethod,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP.",
    });
  }
};

/*
 * =========================================================
 * LOGIN
 * POST /api/v1/auth/login
 * =========================================================
 */
exports.login = async (req, res) => {
  try {
    const { identifier, username, password } = req.body;
    const loginIdentifier = identifier || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email or phone and password are required.",
      });
    }

    const normalizedIdentifier = loginIdentifier.trim().toLowerCase();

    const user = await User.findOne({
      deletedAt: null,
      $or: [
        { username: normalizedIdentifier },
        { email: normalizedIdentifier },
        { phone: loginIdentifier.trim() },
      ],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is currently inactive.",
      });
    }

    if (user.accountStatus === "pending_verification") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING_VERIFICATION",
        message: "Please verify your account before logging in.",
        verificationRequired: true,
        userId: user._id,
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended.",
      });
    }

    if (user.accountStatus === "disabled") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Your account has been disabled.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip || req.headers["x-forwarded-for"] || null;

    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType,
        accountStatus: user.accountStatus,
        photo: user.photo,
        biometricEnabled: user.biometricEnabled,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to log in.",
    });
  }
};

/*
 * =========================================================
 * GET CURRENT AUTHENTICATED USER
 * GET /api/v1/auth/me
 * =========================================================
 */
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        fullname: req.user.fullname,
        firstName: req.user.firstName,
        middleName: req.user.middleName,
        lastName: req.user.lastName,
        username: req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        accountType: req.user.accountType,
        accountStatus: req.user.accountStatus,
        photo: req.user.photo,
        biometricEnabled: req.user.biometricEnabled,
        emailVerified: req.user.emailVerified,
        phoneVerified: req.user.phoneVerified,
        lastLoginAt: req.user.lastLoginAt,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user information.",
    });
  }
};

/*
 * =========================================================
 * LOGOUT
 * POST /api/v1/auth/logout
 * =========================================================
 */
exports.logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
};