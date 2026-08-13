const mongoose = require("mongoose");

const Resident = require("../models/Resident");
const Household = require("../models/Household");

const generateResidentId = require("../utils/generateResidentId");
const getPagination = require("../utils/pagination");

// =========================================================
// VALIDATE OBJECT ID
// =========================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// =========================================================
// CREATE RESIDENT
// =========================================================

const createResident = async (req, res) => {
  try {
    const {
      household,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phoneNumber,
      maritalStatus,
      occupation,
      educationLevel,
      relationshipToHead,
      latitude,
      longitude,
      accuracy,
      photo,
      photoPublicId,
    } = req.body;

    if (!household) {
      return res.status(400).json({
        success: false,
        message: "Household is required.",
      });
    }

    if (!isValidObjectId(household)) {
      return res.status(400).json({
        success: false,
        message: "Invalid household ID.",
      });
    }

    const householdRecord = await Household.findOne({
      _id: household,
      deletedAt: null,
      status: "active",
    });

    if (!householdRecord) {
      return res.status(404).json({
        success: false,
        message: "Household not found.",
      });
    }

    if (relationshipToHead === "head") {
      const existingHead = await Resident.findOne({
        household,
        relationshipToHead: "head",
        deletedAt: null,
        status: "active",
      });

      if (existingHead) {
        return res.status(409).json({
          success: false,
          message: "This household already has a registered household head.",
        });
      }
    }

    const residentId = await generateResidentId();

    const resident = await Resident.create({
      residentId,
      household,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phoneNumber,
      maritalStatus,
      occupation,
      educationLevel,
      relationshipToHead,

      photo: photo || null,
      photoPublicId: photoPublicId || null,

      gps:
        latitude !== undefined && longitude !== undefined
          ? {
              latitude: Number(latitude),
              longitude: Number(longitude),
              accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
              capturedAt: new Date(),
            }
          : undefined,

      registeredBy: req.user._id,

      verificationStatus: "pending",

      identityStatus: "pending",

      status: "active",
    });

    if (relationshipToHead === "head") {
      householdRecord.householdHead = resident._id;

      householdRecord.updatedBy = req.user._id;

      await householdRecord.save();
    }

    const createdResident = await Resident.findById(resident._id)
      .populate(
        "household",
        "householdId compound houseNumber gps householdHead status"
      )
      .populate("registeredBy", "fullname username photo")
      .populate("verifiedBy", "fullname username photo");

    return res.status(201).json({
      success: true,
      message: "Resident registered successfully.",
      data: createdResident,
    });
  } catch (error) {
    console.error("CREATE RESIDENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register resident.",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// =========================================================
// GET RESIDENTS
// =========================================================

const getResidents = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const search = req.query.search?.trim();

    const verificationStatus = req.query.verificationStatus?.trim();

    const identityStatus = req.query.identityStatus?.trim();

    const household = req.query.household?.trim();

    const filter = {
      deletedAt: null,
      status: "active",
    };

    if (search) {
      filter.$or = [
        {
          residentId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          firstName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          middleName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phoneNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (
      verificationStatus &&
      ["pending", "verified", "rejected"].includes(verificationStatus)
    ) {
      filter.verificationStatus = verificationStatus;
    }

    if (
      identityStatus &&
      ["pending", "active", "suspended", "deceased", "moved"].includes(
        identityStatus
      )
    ) {
      filter.identityStatus = identityStatus;
    }

    if (household && isValidObjectId(household)) {
      filter.household = household;
    }

    const [residents, total] = await Promise.all([
      Resident.find(filter)
        .populate(
          "household",
          "householdId compound houseNumber gps householdHead status"
        )
        .populate("registeredBy", "fullname username photo")
        .populate("verifiedBy", "fullname username photo")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Resident.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: residents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET RESIDENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load residents.",
    });
  }
};

// =========================================================
// GET RESIDENT BY ID
// =========================================================

const getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID.",
      });
    }

    const resident = await Resident.findOne({
      _id: id,
      deletedAt: null,
    })
      .populate(
        "household",
        "householdId compound houseNumber gps householdHead status"
      )
      .populate("registeredBy", "fullname username photo")
      .populate("verifiedBy", "fullname username photo");

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    return res.json({
      success: true,
      data: resident,
    });
  } catch (error) {
    console.error("GET RESIDENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load resident profile.",
    });
  }
};

// =========================================================
// UPDATE RESIDENT
// =========================================================

const updateResident = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID.",
      });
    }

    const resident = await Resident.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    const {
      household,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phoneNumber,
      maritalStatus,
      occupation,
      educationLevel,
      relationshipToHead,
      photo,
      photoPublicId,
      latitude,
      longitude,
      accuracy,
    } = req.body;

    const oldHouseholdId = resident.household?.toString();

    const newHouseholdId =
      household !== undefined ? household : oldHouseholdId;

    // =======================================================
    // HOUSEHOLD VALIDATION
    // =======================================================

    if (!isValidObjectId(newHouseholdId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid household ID.",
      });
    }

    const householdRecord = await Household.findOne({
      _id: newHouseholdId,
      deletedAt: null,
      status: "active",
    });

    if (!householdRecord) {
      return res.status(404).json({
        success: false,
        message: "Selected household was not found.",
      });
    }

    // =======================================================
    // HOUSEHOLD HEAD VALIDATION
    // =======================================================

    if (relationshipToHead === "head") {
      const existingHead = await Resident.findOne({
        _id: {
          $ne: resident._id,
        },

        household: newHouseholdId,

        relationshipToHead: "head",

        deletedAt: null,

        status: "active",
      });

      if (existingHead) {
        return res.status(409).json({
          success: false,
          message:
            "This household already has another registered household head.",
        });
      }
    }

    // =======================================================
    // PERSONAL INFORMATION
    // =======================================================

    if (household !== undefined) {
      resident.household = newHouseholdId;
    }

    if (firstName !== undefined) {
      resident.firstName = String(firstName).trim();
    }

    if (middleName !== undefined) {
      resident.middleName = String(middleName).trim();
    }

    if (lastName !== undefined) {
      resident.lastName = String(lastName).trim();
    }

    if (gender !== undefined) {
      resident.gender = gender;
    }

    if (dateOfBirth !== undefined) {
      resident.dateOfBirth = dateOfBirth;
    }

    if (phoneNumber !== undefined) {
      resident.phoneNumber = String(phoneNumber).trim();
    }

    if (maritalStatus !== undefined) {
      resident.maritalStatus = maritalStatus;
    }

    if (occupation !== undefined) {
      resident.occupation = String(occupation).trim();
    }

    if (educationLevel !== undefined) {
      resident.educationLevel = String(educationLevel).trim();
    }

    // =======================================================
    // PHOTO
    // =======================================================

    if (photo !== undefined) {
      resident.photo = photo || null;
    }

    if (photoPublicId !== undefined) {
      resident.photoPublicId = photoPublicId || null;
    }

    // =======================================================
    // RELATIONSHIP
    // =======================================================

    if (relationshipToHead !== undefined) {
      resident.relationshipToHead = relationshipToHead;
    }

    // =======================================================
    // GPS
    // =======================================================

    if (latitude !== undefined && longitude !== undefined) {
      resident.gps = {
        latitude: Number(latitude),

        longitude: Number(longitude),

        accuracy: accuracy !== undefined ? Number(accuracy) : undefined,

        capturedAt: new Date(),
      };
    }

    await resident.save();

    // =======================================================
    // OLD HOUSEHOLD CLEANUP
    // =======================================================

    if (oldHouseholdId && oldHouseholdId !== newHouseholdId.toString()) {
      const oldHousehold = await Household.findById(oldHouseholdId);

      if (
        oldHousehold &&
        oldHousehold.householdHead?.toString() === resident._id.toString()
      ) {
        oldHousehold.householdHead = null;

        oldHousehold.updatedBy = req.user._id;

        await oldHousehold.save();
      }
    }

    // =======================================================
    // NEW HOUSEHOLD HEAD
    // =======================================================

    if (resident.relationshipToHead === "head") {
      householdRecord.householdHead = resident._id;

      householdRecord.updatedBy = req.user._id;

      await householdRecord.save();
    } else if (
      householdRecord.householdHead?.toString() === resident._id.toString()
    ) {
      householdRecord.householdHead = null;

      householdRecord.updatedBy = req.user._id;

      await householdRecord.save();
    }

    // =======================================================
    // RETURN UPDATED RECORD
    // =======================================================

    const updatedResident = await Resident.findById(resident._id)
      .populate(
        "household",
        "householdId compound houseNumber gps householdHead status"
      )
      .populate("registeredBy", "fullname username photo")
      .populate("verifiedBy", "fullname username photo");

    return res.json({
      success: true,
      message: "Resident updated successfully.",
      data: updatedResident,
    });
  } catch (error) {
    console.error("UPDATE RESIDENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update resident.",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// =========================================================
// EXPORT RESIDENTS - EXCEL
// =========================================================

const exportResidentsExcel = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: "Excel export feature coming soon.",
    });
  } catch (error) {
    console.error("EXPORT EXCEL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to export residents to Excel.",
    });
  }
};

// =========================================================
// EXPORT RESIDENTS - PDF
// =========================================================

const exportResidentsPDF = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: "PDF export feature coming soon.",
    });
  } catch (error) {
    console.error("EXPORT PDF ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to export residents to PDF.",
    });
  }
};

module.exports = {
  createResident,
  getResidents,
  getResidentById,
  updateResident,
  exportResidentsExcel,
  exportResidentsPDF,
};