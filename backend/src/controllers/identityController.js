const crypto = require("crypto");
const QRCode = require("qrcode");
const Resident = require("../models/Resident");

const Household = require("../models/Household");
const Relationship = require("../models/Relationship");

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

const getResidentProfile = async (req, res) => {
  try {
    const resident = await Resident.findOne({
      _id: req.params.residentId,
      deletedAt: null,
      status: "active",
    })
      .populate(
        "household",
        "householdId community compound houseNumber"
      )
      .populate(
        "registeredBy",
        "fullname username"
      )
      .populate(
        "verifiedBy",
        "fullname username"
      );

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    const relationships = await Relationship.find({
      household: resident.household?._id,
      $or: [
        {
          fromResident: resident._id,
        },
        {
          toResident: resident._id,
        },
      ],
      deletedAt: null,
    })
      .populate(
        "fromResident",
        "residentId firstName middleName lastName gender"
      )
      .populate(
        "toResident",
        "residentId firstName middleName lastName gender"
      );

    const fullName = [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return res.json({
      success: true,

      data: {
        identity: {
          residentId: resident.residentId,
          identityStatus:
            resident.identityStatus,
          verificationStatus:
            resident.verificationStatus,
          identityIssuedAt:
            resident.identityIssuedAt,
          identityUpdatedAt:
            resident.identityUpdatedAt,
        },

        resident: {
          id: resident._id,
          fullName,
          firstName: resident.firstName,
          middleName: resident.middleName,
          lastName: resident.lastName,
          gender: resident.gender,
          dateOfBirth:
            resident.dateOfBirth,
          relationshipToHead:
            resident.relationshipToHead,
          photo: resident.photo,
        },

        household: resident.household
          ? {
              id: resident.household._id,
              householdId:
                resident.household.householdId,
              community:
                resident.household.community,
              compound:
                resident.household.compound,
              houseNumber:
                resident.household.houseNumber,
            }
          : null,

        verification: {
          status:
            resident.verificationStatus,
          verifiedAt:
            resident.verifiedAt,
          verifiedBy:
            resident.verifiedBy
              ? {
                  id: resident.verifiedBy._id,
                  fullname:
                    resident.verifiedBy.fullname,
                  username:
                    resident.verifiedBy.username,
                }
              : null,
          rejectionReason:
            resident.rejectionReason,
        },

        registration: {
          registeredAt:
            resident.createdAt,
          registeredBy:
            resident.registeredBy
              ? {
                  id: resident.registeredBy._id,
                  fullname:
                    resident.registeredBy.fullname,
                  username:
                    resident.registeredBy.username,
                }
              : null,
        },

        relationships,

        qr: {
          available:
            !!resident.qrToken,
          verificationEndpoint:
            resident.qrToken
              ? `/api/v1/identity/verify/${resident.qrToken}`
              : null,
        },
      },
    });

  } catch (error) {
    console.error(
      "GET RESIDENT PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve resident profile.",
    });
  }
};

module.exports = {
  generateResidentQR,
  verifyResidentQR,
  getResidentProfile,
};