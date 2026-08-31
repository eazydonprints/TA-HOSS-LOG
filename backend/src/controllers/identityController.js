const crypto = require("crypto");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

const Resident = require("../models/Resident");
const Relationship = require("../models/Relationship");


/*
=========================================================
TA-HOSS CONFIGURATION
=========================================================
*/

const COMMUNITY_NAME = "Ta-hoss Community";

const COMMUNITY_LOCATION =
  "Riyom Local Government Area, Plateau State, Nigeria";


/*
=========================================================
HELPERS
=========================================================
*/


const buildFullName = (resident) => {
  return [
    resident.firstName,
    resident.middleName,
    resident.lastName,
  ]
    .filter(Boolean)
    .join(" ");
};


const getVerificationBaseUrl = () => {
  /*
    Use an environment variable in production.

    Example:

    TA_HOSS_PUBLIC_URL=https://your-domain.com

    If it is not configured, the API-relative route is
    returned instead. This keeps local development working.
  */

  const baseUrl =
    process.env.TA_HOSS_PUBLIC_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.API_URL ||
    "";

  return baseUrl.replace(/\/$/, "");
};


const buildVerificationUrl = (token) => {
  const baseUrl = getVerificationBaseUrl();

  /*
    Normal HTTPS URL is preferable to a custom
    TAHOSS:// protocol because ordinary phone cameras
    can open HTTPS links.
  */

  if (baseUrl) {
    return `${baseUrl}/api/v1/identity/verify/${token}`;
  }

  /*
    Development fallback.

    Frontend can still use the API base URL when displaying
    the QR code during local development.
  */

  return `/api/v1/identity/verify/${token}`;
};


const generateQRData = async (token) => {
  const verificationUrl =
    buildVerificationUrl(token);

  const qrCode =
    await QRCode.toDataURL(
      verificationUrl,
      {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 500,
      }
    );

  return {
    verificationUrl,
    qrCode,
  };
};


/*
=========================================================
GENERATE RESIDENT QR
=========================================================
*/

const generateResidentQR = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Resident ID is required.",
      });
    }

    const resident = await Resident.findOne({
      _id: id,
      deletedAt: null,
      status: "active",
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found or inactive.",
      });
    }

    /*
    =========================================================
    QR REQUIREMENTS
    =========================================================
    */

    if (resident.verificationStatus !== "verified") {
      return res.status(400).json({
        success: false,
        message:
          "QR identity can only be generated for a verified resident.",

        data: {
          verificationStatus:
            resident.verificationStatus,

          identityStatus:
            resident.identityStatus,

          residentStatus:
            resident.status,
        },
      });
    }

    if (resident.identityStatus !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Resident digital identity is not active.",

        data: {
          verificationStatus:
            resident.verificationStatus,

          identityStatus:
            resident.identityStatus,

          residentStatus:
            resident.status,
        },
      });
    }

    /*
    =========================================================
    GENERATE TOKEN ONLY IF ONE DOES NOT EXIST
    =========================================================
    */

    if (!resident.qrToken) {
      resident.qrToken =
        crypto.randomBytes(32).toString("hex");

      resident.identityUpdatedAt =
        new Date();

      await resident.save();
    }

    const qrData =
      await generateQRData(resident.qrToken);

    return res.status(200).json({
      success: true,

      message:
        "TA-HOSS QR identity ready.",

      data: {
        residentId:
          resident.residentId,

        name:
          buildFullName(resident),

        identityStatus:
          resident.identityStatus,

        verificationStatus:
          resident.verificationStatus,

        qrToken:
          resident.qrToken,

        verificationUrl:
          qrData.verificationUrl,

        qrCode:
          qrData.qrCode,

        generatedAt:
          resident.identityUpdatedAt ||
          new Date(),
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

/*
=========================================================
PUBLIC QR VERIFICATION
=========================================================
*/

const verifyResidentQR = async (req, res) => {
  try {
    const token =
      req.params.token?.trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        valid: false,
        message:
          "QR verification token is required.",
      });
    }


    const resident =
      await Resident.findOne({
        qrToken: token,
        deletedAt: null,
        status: "active",
      }).select(
        [
          "residentId",
          "firstName",
          "middleName",
          "lastName",
          "gender",
          "photo",
          "verificationStatus",
          "identityStatus",
          "identityIssuedAt",
          "identityUpdatedAt",
        ].join(" ")
      );


    if (!resident) {
      return res.status(404).json({
        success: false,
        valid: false,
        message:
          "Invalid or unrecognized TA-HOSS QR identity.",
      });
    }


    /*
    -------------------------------------------------------
    CHECK IDENTITY STATE
    -------------------------------------------------------
    */

    if (
      resident.verificationStatus !==
      "verified"
    ) {
      return res.status(403).json({
        success: false,
        valid: false,
        message:
          "This resident has not been verified.",
      });
    }


    if (
      resident.identityStatus !==
      "active"
    ) {
      return res.status(403).json({
        success: false,
        valid: false,
        message:
          "This TA-HOSS identity is not currently active.",
      });
    }


    /*
    -------------------------------------------------------
    PUBLIC RESPONSE
    -------------------------------------------------------

    Do not expose:
    - phone number
    - household details
    - GPS
    - biometric information
    - registeredBy
    - internal MongoDB ID
    */

    return res.json({
      success: true,

      valid: true,

      message:
        "TA-HOSS identity verified.",

      data: {
        residentId:
          resident.residentId,

        name:
          buildFullName(resident),

        gender:
          resident.gender,

        photo:
          resident.photo || null,

        verificationStatus:
          resident.verificationStatus,

        identityStatus:
          resident.identityStatus,

        identityIssuedAt:
          resident.identityIssuedAt,

        identityUpdatedAt:
          resident.identityUpdatedAt,
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


/*
=========================================================
GET RESIDENT DIGITAL IDENTITY PROFILE
=========================================================
*/

const getResidentProfile = async (
  req,
  res
) => {
  try {
    const resident =
      await Resident.findOne({
        _id: req.params.residentId,
        deletedAt: null,
        status: "active",
      })
        .populate(
          "household",
          "householdId community compound houseNumber gps"
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
        message:
          "Resident not found.",
      });
    }


    /*
    -------------------------------------------------------
    HOUSEHOLD RELATIONSHIPS
    -------------------------------------------------------
    */

    const relationships =
      resident.household?._id
        ? await Relationship.find({
            household:
              resident.household._id,

            $or: [
              {
                fromResident:
                  resident._id,
              },
              {
                toResident:
                  resident._id,
              },
            ],

            deletedAt: null,
          })
            .populate(
              "fromResident",
              "residentId firstName middleName lastName gender photo"
            )
            .populate(
              "toResident",
              "residentId firstName middleName lastName gender photo"
            )
        : [];


    const fullName =
      buildFullName(resident);


    /*
    -------------------------------------------------------
    QR INFORMATION
    -------------------------------------------------------
    */

    let qr = {
      available:
        !!resident.qrToken,

      verificationEndpoint:
        resident.qrToken
          ? buildVerificationUrl(
              resident.qrToken
            )
          : null,

      qrCode: null,
    };


    /*
      Only generate the QR image if a token already
      exists. Opening the profile should not silently
      create an identity token.
    */

    if (resident.qrToken) {
      const qrData =
        await generateQRData(
          resident.qrToken
        );

      qr = {
        ...qr,
        verificationEndpoint:
          qrData.verificationUrl,
        qrCode:
          qrData.qrCode,
      };
    }


    /*
    -------------------------------------------------------
    RESPONSE
    -------------------------------------------------------
    */

    return res.json({
      success: true,

      data: {
        identity: {
          residentId:
            resident.residentId,

          identityStatus:
            resident.identityStatus,

          verificationStatus:
            resident.verificationStatus,

          identityIssuedAt:
            resident.identityIssuedAt,

          identityUpdatedAt:
            resident.identityUpdatedAt,

          qrAvailable:
            !!resident.qrToken,
        },


        resident: {
          id:
            resident._id,

          fullName,

          firstName:
            resident.firstName,

          middleName:
            resident.middleName,

          lastName:
            resident.lastName,

          gender:
            resident.gender,

          dateOfBirth:
            resident.dateOfBirth,

          phoneNumber:
            resident.phoneNumber,

          maritalStatus:
            resident.maritalStatus,

          occupation:
            resident.occupation,

          educationLevel:
            resident.educationLevel,

          relationshipToHead:
            resident.relationshipToHead,

          photo:
            resident.photo,
        },


        household:
          resident.household
            ? {
                id:
                  resident.household._id,

                householdId:
                  resident.household.householdId,

                community:
                  resident.household.community,

                compound:
                  resident.household.compound,

                houseNumber:
                  resident.household.houseNumber,

                gps:
                  resident.household.gps ||
                  null,
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
                  id:
                    resident.verifiedBy._id,

                  fullname:
                    resident.verifiedBy.fullname,

                  username:
                    resident.verifiedBy.username,
                }
              : null,

          rejectionReason:
            resident.rejectionReason,
        },


        biometric: {
          enrolled:
            resident.biometric
              ?.enrolled || false,

          provider:
            resident.biometric
              ?.provider || null,

          enrolledAt:
            resident.biometric
              ?.enrolledAt || null,
        },


        registration: {
          registeredAt:
            resident.createdAt,

          updatedAt:
            resident.updatedAt,

          registeredBy:
            resident.registeredBy
              ? {
                  id:
                    resident.registeredBy._id,

                  fullname:
                    resident.registeredBy.fullname,

                  username:
                    resident.registeredBy.username,
                }
              : null,
        },


        relationships,


        qr,
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
        "Failed to retrieve resident identity profile.",
    });
  }
};


/*
=========================================================
GENERATE RESIDENT ID CARD DATA
=========================================================
*/

const generateResidentIdCard = async (
  req,
  res
) => {
  try {
    const resident =
      await Resident.findOne({
        _id: req.params.residentId,
        deletedAt: null,
        status: "active",
      })
        .populate(
          "household",
          "householdId community compound houseNumber"
        )
        .select(
          [
            "residentId",
            "firstName",
            "middleName",
            "lastName",
            "gender",
            "dateOfBirth",
            "photo",
            "qrToken",
            "verificationStatus",
            "identityStatus",
            "identityIssuedAt",
            "household",
          ].join(" ")
        );


    if (!resident) {
      return res.status(404).json({
        success: false,
        message:
          "Resident not found.",
      });
    }


    /*
    -------------------------------------------------------
    ID CARD REQUIREMENTS
    -------------------------------------------------------
    */

    if (
      resident.verificationStatus !==
      "verified"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An ID card can only be generated for a verified resident.",
      });
    }


    if (
      resident.identityStatus !==
      "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Resident digital identity is not active.",
      });
    }


    if (!resident.qrToken) {
      return res.status(400).json({
        success: false,
        message:
          "Resident does not have a QR identity. Generate the QR identity first.",
      });
    }


    const fullName =
      buildFullName(resident);


    const qrData =
      await generateQRData(
        resident.qrToken
      );


    return res.json({
      success: true,

      message:
        "TA-HOSS ID card data generated successfully.",

      data: {
        card: {
          organization:
            "TA-HOSS LOG",

          title:
            "COMMUNITY REGISTER",

          community:
            COMMUNITY_NAME,

          location:
            COMMUNITY_LOCATION,
        },


        resident: {
          residentId:
            resident.residentId,

          fullName,

          gender:
            resident.gender,

          dateOfBirth:
            resident.dateOfBirth,

          photo:
            resident.photo || null,
        },


        household:
          resident.household
            ? {
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


        identity: {
          verificationStatus:
            resident.verificationStatus,

          identityStatus:
            resident.identityStatus,

          identityIssuedAt:
            resident.identityIssuedAt,
        },


        qr: {
          verificationUrl:
            qrData.verificationUrl,

          qrCode:
            qrData.qrCode,
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


/*
=========================================================
GENERATE RESIDENT ID CARD PDF
=========================================================
*/

const generateResidentIdCardPDF = async (
  req,
  res
) => {
  try {
    const resident =
      await Resident.findOne({
        _id: req.params.residentId,
        deletedAt: null,
        status: "active",
      })
        .populate(
          "household",
          "householdId community compound houseNumber"
        )
        .select(
          [
            "residentId",
            "firstName",
            "middleName",
            "lastName",
            "gender",
            "dateOfBirth",
            "photo",
            "qrToken",
            "verificationStatus",
            "identityStatus",
            "household",
          ].join(" ")
        );


    if (!resident) {
      return res.status(404).json({
        success: false,
        message:
          "Resident not found.",
      });
    }


    if (
      resident.verificationStatus !==
      "verified"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID card can only be generated for a verified resident.",
      });
    }


    if (
      resident.identityStatus !==
      "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Resident digital identity is not active.",
      });
    }


    if (!resident.qrToken) {
      return res.status(400).json({
        success: false,
        message:
          "Resident does not have a QR identity.",
      });
    }


    const fullName =
      buildFullName(resident);


    const verificationUrl =
      buildVerificationUrl(
        resident.qrToken
      );


    const qrBuffer =
      await QRCode.toBuffer(
        verificationUrl,
        {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 300,
        }
      );


    /*
    -------------------------------------------------------
    PDF CARD DIMENSIONS
    -------------------------------------------------------

    Approximately CR80 ID card size.
    */

    const doc =
      new PDFDocument({
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


    /*
    -------------------------------------------------------
    BACKGROUND
    -------------------------------------------------------
    */

    doc
      .rect(
        0,
        0,
        242.65,
        153.07
      )
      .fill("#ffffff");


    /*
    -------------------------------------------------------
    HEADER
    -------------------------------------------------------
    */

    doc
      .rect(
        0,
        0,
        242.65,
        32
      )
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


    /*
    -------------------------------------------------------
    PHOTO AREA
    -------------------------------------------------------
    */

    doc
      .lineWidth(1)
      .rect(
        12,
        43,
        65,
        78
      )
      .stroke("#123B63");


    /*
    PDFKit may not be able to directly load every
    remote image URL. If the photo cannot be loaded,
    the card continues with a placeholder.
    */

    let photoLoaded = false;


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

        photoLoaded = true;

      } catch (photoError) {
        console.warn(
          "PHOTO EMBEDDING FAILED:",
          photoError.message
        );
      }
    }


    if (!photoLoaded) {
      doc
        .fillColor("#eeeeee")
        .rect(
          13,
          44,
          63,
          76
        )
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


    /*
    -------------------------------------------------------
    RESIDENT DETAILS
    -------------------------------------------------------
    */

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
          ellipsis: true,
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
      `Gender: ${
        resident.gender ||
        "N/A"
      }`,
      87,
      89
    );


    /*
    -------------------------------------------------------
    VERIFIED STATUS
    -------------------------------------------------------
    */

    doc
      .fillColor("#16803A")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(
        "VERIFIED",
        87,
        105
      );


    /*
    -------------------------------------------------------
    QR CODE
    -------------------------------------------------------
    */

    doc.image(
      qrBuffer,
      174,
      95,
      {
        width: 55,
        height: 55,
      }
    );


    /*
    -------------------------------------------------------
    FOOTER
    -------------------------------------------------------
    */

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


/*
=========================================================
EXPORTS
=========================================================
*/

module.exports = {
  generateResidentQR,
  verifyResidentQR,
  getResidentProfile,
  generateResidentIdCard,
  generateResidentIdCardPDF,
};