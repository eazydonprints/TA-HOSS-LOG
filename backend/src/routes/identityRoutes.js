const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ROLES = require("../config/roles");

const {
  generateResidentQR,
  verifyResidentQR,
  getResidentProfile,
  generateResidentIdCard,
  generateResidentIdCardPDF,
} = require("../controllers/identityController");

/*
=========================================================
PUBLIC QR VERIFICATION
=========================================================

This endpoint intentionally does NOT require authentication.

A person scanning a valid TA-HOSS QR code should be able
to verify the identity without logging into TA-HOSS LOG.

Only limited public identity information is returned.
*/

router.get(
  "/verify/:token",
  verifyResidentQR
);


/*
=========================================================
GENERATE RESIDENT QR
=========================================================

Only administrators and registration officers can
generate/re-generate a resident QR identity.
*/

router.post(
  "/:id/qr",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER
  ),
  generateResidentQR
);


/*
=========================================================
RESIDENT DIGITAL IDENTITY PROFILE
=========================================================

Used by the authenticated TA-HOSS LOG frontend.
*/

router.get(
  "/:residentId/profile",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  getResidentProfile
);


/*
=========================================================
RESIDENT ID CARD DATA
=========================================================

Returns structured information required by the
frontend ID-card interface.
*/

router.get(
  "/:residentId/id-card",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  generateResidentIdCard
);


/*
=========================================================
RESIDENT ID CARD PDF
=========================================================

Returns a printable PDF version of the resident card.
*/

router.get(
  "/:residentId/id-card/pdf",
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.REGISTRATION_OFFICER,
    ROLES.VERIFICATION_OFFICER,
    ROLES.VIEWER
  ),
  generateResidentIdCardPDF
);


module.exports = router;