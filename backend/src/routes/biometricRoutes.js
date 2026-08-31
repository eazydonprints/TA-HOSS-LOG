const express = require("express");

const router = express.Router();

const biometricController =
  require("../controllers/biometricController");

const authMiddleware =
  require("../middleware/authMiddleware");


/* =========================================================
   AUTH MIDDLEWARE COMPATIBILITY
========================================================= */

const protect =
  typeof authMiddleware === "function"
    ? authMiddleware
    : authMiddleware?.protect;


if (typeof protect !== "function") {
  throw new Error(
    "Biometric routes: authentication middleware is not available."
  );
}


/* =========================================================
   BIOMETRIC ROLE AUTHORIZATION
========================================================= */

const requireBiometricManager = (
  req,
  res,
  next
) => {

  const role = String(
    req.user?.role || ""
  )
    .trim()
    .toLowerCase();


  const allowedRoles = [
    "super_admin",
    "registration_officer",
    "verification_officer",
  ];


  if (
    !allowedRoles.includes(role)
  ) {

    return res.status(403).json({
      success: false,
      message:
        "You do not have permission to manage biometric records.",
    });
  }


  next();
};


/* =========================================================
   CONTROLLER VALIDATION
========================================================= */

const safeHandler = (
  name,
  handler
) => {

  if (
    typeof handler !==
    "function"
  ) {

    throw new Error(
      `Biometric route handler "${name}" is undefined.`
    );
  }

  return handler;
};


/* =========================================================
   CONTROLLERS
========================================================= */

const {
  getUserRegistrationOptions,
  verifyUserRegistration,

  getResidentRegistrationOptions,
  verifyResidentRegistration,

  getLoginOptions,
  verifyBiometricLogin,

  getUserCredentials,
  getResidentCredentials,

  removeUserCredential,
  removeResidentCredential,

  getBiometricStatus,
  getResidentBiometricStatus,
} = biometricController;


/* =========================================================
   RESIDENT BIOMETRIC ENROLLMENT
========================================================= */

/*
POST
/api/v1/biometric/residents/:residentId/enroll
*/

router.post(
  "/residents/:residentId/enroll",

  protect,

  requireBiometricManager,

  safeHandler(
    "getResidentRegistrationOptions",
    getResidentRegistrationOptions
  )
);


/*
POST
/api/v1/biometric/residents/:residentId/enroll/verify
*/

router.post(
  "/residents/:residentId/enroll/verify",

  protect,

  requireBiometricManager,

  safeHandler(
    "verifyResidentRegistration",
    verifyResidentRegistration
  )
);


/*
GET
/api/v1/biometric/residents/:residentId
*/

router.get(
  "/residents/:residentId",

  protect,

  safeHandler(
    "getResidentCredentials",
    getResidentCredentials
  )
);


/*
GET
/api/v1/biometric/residents/:residentId/status
*/

router.get(
  "/residents/:residentId/status",

  protect,

  safeHandler(
    "getResidentBiometricStatus",
    getResidentBiometricStatus
  )
);


/*
DELETE
/api/v1/biometric/residents/:residentId/credentials/:credentialId
*/

router.delete(
  "/residents/:residentId/credentials/:credentialId",

  protect,

  requireBiometricManager,

  safeHandler(
    "removeResidentCredential",
    removeResidentCredential
  )
);


/* =========================================================
   USER BIOMETRIC REGISTRATION
========================================================= */

/*
POST
/api/v1/biometric/registration/options
*/

router.post(
  "/registration/options",

  protect,

  safeHandler(
    "getUserRegistrationOptions",
    getUserRegistrationOptions
  )
);


/*
POST
/api/v1/biometric/registration/verify
*/

router.post(
  "/registration/verify",

  protect,

  safeHandler(
    "verifyUserRegistration",
    verifyUserRegistration
  )
);


/* =========================================================
   BIOMETRIC LOGIN
========================================================= */

/*
IMPORTANT:

These two endpoints MUST NOT use JWT authentication.

The user does not have a JWT yet.
The biometric assertion creates the JWT.
*/


/*
POST
/api/v1/biometric/login/options
*/

router.post(
  "/login/options",

  safeHandler(
    "getLoginOptions",
    getLoginOptions
  )
);


/*
POST
/api/v1/biometric/login/verify
*/

router.post(
  "/login/verify",

  safeHandler(
    "verifyBiometricLogin",
    verifyBiometricLogin
  )
);


/* =========================================================
   USER CREDENTIAL MANAGEMENT
========================================================= */

/*
GET
/api/v1/biometric/credentials
*/

router.get(
  "/credentials",

  protect,

  safeHandler(
    "getUserCredentials",
    getUserCredentials
  )
);


/*
DELETE
/api/v1/biometric/credentials/:credentialId
*/

router.delete(
  "/credentials/:credentialId",

  protect,

  safeHandler(
    "removeUserCredential",
    removeUserCredential
  )
);


/* =========================================================
   USER BIOMETRIC STATUS
========================================================= */

/*
GET
/api/v1/biometric/status
*/

router.get(
  "/status",

  protect,

  safeHandler(
    "getBiometricStatus",
    getBiometricStatus
  )
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;