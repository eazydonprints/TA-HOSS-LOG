const crypto = require("crypto");
const QRCode = require("qrcode");
const Resident = require("../models/Resident");

const Household = require("../models/Household");
const Relationship = require("../models/Relationship");

const PDFDocument = require("pdfkit");

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

const generateResidentIdCard = async (req, res) => {
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
      .select(
        "residentId firstName middleName lastName gender dateOfBirth " +
        "photo qrToken verificationStatus identityStatus household"
      );

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
          "An ID card can only be generated for a verified active resident.",
      });
    }

    if (!resident.qrToken) {
      return res.status(400).json({
        success: false,
        message:
          "Resident does not have a QR identity. Generate the QR identity first.",
      });
    }

    const fullName = [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");

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

    return res.json({
      success: true,
      message: "TA-HOSS ID card data generated successfully.",

      data: {
        card: {
          organization: "TA-HOSS LOG",
          title: "COMMUNITY REGISTER",
          community: "Ta-hoss Community",
          location: "Riyom Local Government Area, Plateau State, Nigeria",
        },

        resident: {
          residentId: resident.residentId,
          fullName,
          gender: resident.gender,
          dateOfBirth: resident.dateOfBirth,
          photo: resident.photo || null,
        },

        household: resident.household
          ? {
              householdId: resident.household.householdId,
              community: resident.household.community,
              compound: resident.household.compound,
              houseNumber: resident.household.houseNumber,
            }
          : null,

        identity: {
          verificationStatus:
            resident.verificationStatus,
          identityStatus:
            resident.identityStatus,
        },

        qr: {
          verificationUrl,
          qrCode,
        },
      },
    });

  } catch (error) {
    console.error(
      "GENERATE ID CARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate TA-HOSS ID card.",
    });
  }
};

const generateResidentIdCardPDF = async (req, res) => {
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
      .select(
        "residentId firstName middleName lastName gender " +
        "dateOfBirth photo qrToken verificationStatus identityStatus household"
      );

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
          "ID card can only be generated for a verified active resident.",
      });
    }

    if (!resident.qrToken) {
      return res.status(400).json({
        success: false,
        message:
          "Resident does not have a QR identity.",
      });
    }

    const fullName = [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const verificationUrl =
      `TAHOSS://verify/${resident.qrToken}`;

    const qrBuffer =
      await QRCode.toBuffer(
        verificationUrl,
        {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 300,
        }
      );

    const doc = new PDFDocument({
      size: [242.65, 153.07],
      margin: 0,
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="TA-HOSS-${resident.residentId}.pdf"`
    );

    doc.pipe(res);

    // Background
    doc
      .rect(0, 0, 242.65, 153.07)
      .fill("#ffffff");

    // Header
    doc
      .rect(0, 0, 242.65, 32)
      .fill("#123B63");

    doc
      .fillColor("#ffffff")
      .fontSize(15)
      .font("Helvetica-Bold")
      .text(
        "TA-HOSS LOG",
        12,
        7,
        {
          width: 218,
          align: "center",
        }
      );

    doc
      .fontSize(7)
      .font("Helvetica")
      .text(
        "COMMUNITY REGISTER",
        12,
        23,
        {
          width: 218,
          align: "center",
        }
      );

    // Photo placeholder
    doc
      .lineWidth(1)
      .rect(12, 43, 65, 78)
      .stroke("#123B63");

    if (resident.photo) {
      try {
        doc.image(
          resident.photo,
          13,
          44,
          {
            width: 63,
            height: 76,
          }
        );
      } catch (photoError) {
        console.log(
          "Photo could not be embedded:",
          photoError.message
        );
      }
    } else {
      doc
        .fillColor("#eeeeee")
        .rect(13, 44, 63, 76)
        .fill();

      doc
        .fillColor("#555555")
        .fontSize(8)
        .text(
          "PHOTO",
          13,
          78,
          {
            width: 63,
            align: "center",
          }
        );
    }

    // Resident details
    doc
      .fillColor("#123B63")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        fullName,
        87,
        45,
        {
          width: 143,
        }
      );

    doc
      .fillColor("#222222")
      .font("Helvetica")
      .fontSize(7);

    doc.text(
      `Resident ID: ${resident.residentId}`,
      87,
      63
    );

    doc.text(
      `Household: ${
        resident.household
          ? resident.household.householdId
          : "N/A"
      }`,
      87,
      76
    );

    doc.text(
      `Gender: ${resident.gender || "N/A"}`,
      87,
      89
    );

    doc
      .fillColor("#16803A")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(
        "VERIFIED",
        87,
        105
      );

    // QR code
    doc.image(
      qrBuffer,
      174,
      95,
      {
        width: 55,
        height: 55,
      }
    );

    // Footer
    doc
      .fillColor("#123B63")
      .font("Helvetica")
      .fontSize(6)
      .text(
        "Ta-hoss Community • Riyom LGA • Plateau State",
        10,
        137,
        {
          width: 220,
          align: "center",
        }
      );

    doc.end();

  } catch (error) {
    console.error(
      "GENERATE ID CARD PDF ERROR:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate TA-HOSS ID card PDF.",
      });
    }
  }
};

module.exports = {
  generateResidentQR,
  verifyResidentQR,
  getResidentProfile,
  generateResidentIdCard,
  generateResidentIdCardPDF,
};