const crypto = require("crypto");
const QRCode = require("qrcode");
const Resident = require("../models/Resident");

const generateResidentQR = async (req, res) => {
  try {
    const resident = await Resident.findOne({
      _id: req.params.id,
      deletedAt: null,
      status: "active",
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    if (
      resident.verificationStatus !== "verified" ||
      resident.identityStatus !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "QR identity can only be generated for a verified active resident.",
      });
    }

    // Reuse existing QR token if one already exists
    if (!resident.qrToken) {
      resident.qrToken = crypto.randomBytes(32).toString("hex");
      resident.identityUpdatedAt = new Date();

      await resident.save();
    }

    const verificationUrl =
      `TAHOSS://verify/${resident.qrToken}`;

    const qrCode = await QRCode.toDataURL(
      verificationUrl,
      {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 500,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "TA-HOSS QR identity ready.",
      data: {
        residentId: resident.residentId,
        identityStatus:
          resident.identityStatus,
        verificationUrl,
        qrCode,
      },
    });

  } catch (error) {
    console.error(
      "GENERATE QR ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate resident QR identity.",
    });
  }
};


const verifyResidentQR = async (req, res) => {
  try {
    const resident =
      await Resident.findOne({
        qrToken: req.params.token,
        deletedAt: null,
        status: "active",
      }).select(
        "residentId firstName middleName lastName gender verificationStatus identityStatus"
      );

    if (!resident) {
      return res.status(404).json({
        success: false,
        valid: false,
        message:
          "Invalid or unrecognized TA-HOSS QR code.",
      });
    }

    if (
      resident.verificationStatus !== "verified" ||
      resident.identityStatus !== "active"
    ) {
      return res.status(403).json({
        success: false,
        valid: false,
        message:
          "This TA-HOSS identity is not currently active.",
      });
    }

    return res.json({
      success: true,
      valid: true,
      message:
        "TA-HOSS identity verified.",
      data: {
        residentId:
          resident.residentId,

        name: [
          resident.firstName,
          resident.middleName,
          resident.lastName,
        ]
          .filter(Boolean)
          .join(" "),

        gender:
          resident.gender,

        verificationStatus:
          resident.verificationStatus,

        identityStatus:
          resident.identityStatus,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY QR ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      valid: false,
      message:
        "Failed to verify QR identity.",
    });
  }
};


module.exports = {
  generateResidentQR,
  verifyResidentQR,
};