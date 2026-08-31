const express =
  require("express");

const router =
  express.Router();


const {
  signup,
  verifyAccount,
  resendOTP,
  login,
  getMe,
  logout,
} = require(
  "../controllers/authController"
);


const protect =
  require(
    "../middleware/authMiddleware"
  );


/*
 * =========================================================
 * PUBLIC AUTHENTICATION ROUTES
 * =========================================================
 */


/*
 * Public User Signup
 *
 * POST /api/v1/auth/signup
 */

router.post(
  "/signup",
  signup
);


/*
 * Verify Public User Account
 *
 * POST /api/v1/auth/verify-account
 */

router.post(
  "/verify-account",
  verifyAccount
);


/*
 * Resend Verification OTP
 *
 * POST /api/v1/auth/resend-otp
 */

router.post(
  "/resend-otp",
  resendOTP
);


/*
 * Login
 *
 * POST /api/v1/auth/login
 */

router.post(
  "/login",
  login
);


/*
 * =========================================================
 * PROTECTED AUTHENTICATION ROUTES
 * =========================================================
 */


/*
 * Get Current Authenticated User
 *
 * GET /api/v1/auth/me
 */

router.get(
  "/me",
  protect,
  getMe
);


/*
 * Logout
 *
 * POST /api/v1/auth/logout
 */

router.post(
  "/logout",
  protect,
  logout
);


module.exports =
  router;