const Resident = require("../models/Resident");
const Household = require("../models/Household");

const generateResidentId = require("../utils/generateResidentId");
const getPagination = require("../utils/pagination");


const createResident = async (req, res) => {
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
  } = req.body;


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


  /*
   * Prevent multiple household heads.
   */
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
        message:
          "This household already has a registered household head.",
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

    gps:
      latitude !== undefined &&
      longitude !== undefined
        ? {
            latitude,
            longitude,
            accuracy,
            capturedAt: new Date(),
          }
        : undefined,

    registeredBy: req.user._id,
  });


  /*
   * Automatically make the resident
   * the household head if relationship = head.
   */
  if (relationshipToHead === "head") {
    householdRecord.householdHead =
      resident._id;

    householdRecord.updatedBy =
      req.user._id;

    await householdRecord.save();
  }


  return res.status(201).json({
    success: true,
    message: "Resident registered successfully.",
    data: resident,
  });
};


const getResidents = async (req, res) => {
  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const search = req.query.search?.trim();

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


  const [residents, total] =
    await Promise.all([
      Resident.find(filter)
        .populate(
          "household",
          "householdId compound houseNumber"
        )
        .populate(
          "registeredBy",
          "fullname username"
        )
        .sort({ createdAt: -1 })
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
      totalPages: Math.ceil(
        total / limit
      ),
    },
  });
};


const getResidentById = async (req, res) => {
  const resident =
    await Resident.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
      .populate(
        "household",
        "householdId compound houseNumber gps"
      )
      .populate(
        "registeredBy",
        "fullname username"
      );


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
};


const updateResident = async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    phoneNumber,
    maritalStatus,
    occupation,
    educationLevel,
  } = req.body;


  const resident =
    await Resident.findOne({
      _id: req.params.id,
      deletedAt: null,
    });


  if (!resident) {
    return res.status(404).json({
      success: false,
      message: "Resident not found.",
    });
  }


  if (firstName !== undefined)
    resident.firstName =
      firstName.trim();

  if (middleName !== undefined)
    resident.middleName =
      middleName.trim();

  if (lastName !== undefined)
    resident.lastName =
      lastName.trim();

  if (phoneNumber !== undefined)
    resident.phoneNumber =
      phoneNumber.trim();

  if (maritalStatus !== undefined)
    resident.maritalStatus =
      maritalStatus;

  if (occupation !== undefined)
    resident.occupation =
      occupation.trim();

  if (educationLevel !== undefined)
    resident.educationLevel =
      educationLevel.trim();


  await resident.save();


  return res.json({
    success: true,
    message:
      "Resident updated successfully.",
    data: resident,
  });
};


module.exports = {
  createResident,
  getResidents,
  getResidentById,
  updateResident,
};