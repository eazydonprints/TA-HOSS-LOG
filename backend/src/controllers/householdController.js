const Household = require("../models/Household");
const generateHouseholdId = require("../utils/generateHouseholdId");
const getPagination = require("../utils/pagination");

const Relationship = require("../models/Relationship");
const Resident = require("../models/Resident");

const createHousehold = async (req, res) => {
  const {
    compound,
    houseNumber,
    notes,
    latitude,
    longitude,
    accuracy,
  } = req.body;

  const householdId = await generateHouseholdId();

  const household = await Household.create({
    householdId,

    compound,

    houseNumber,

    notes,

    gps:
      latitude !== undefined && longitude !== undefined
        ? {
            latitude,
            longitude,
            accuracy,
            capturedAt: new Date(),
          }
        : undefined,

    createdBy: req.user._id,
  });

  return res.status(201).json({
    success: true,
    message: "Household registered successfully.",
    data: household,
  });
};


const getHouseholds = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const search = req.query.search?.trim();

  const filter = {
    deletedAt: null,
  };

  if (search) {
    filter.$or = [
      {
        householdId: {
          $regex: search,
          $options: "i",
        },
      },
      {
        compound: {
          $regex: search,
          $options: "i",
        },
      },
      {
        houseNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const [households, total] = await Promise.all([
    Household.find(filter)
      .populate(
        "householdHead",
        "residentId firstName middleName lastName"
      )
      .populate(
        "createdBy",
        "fullname username"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Household.countDocuments(filter),
  ]);

  return res.json({
    success: true,

    data: households,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};


const getHouseholdById = async (req, res) => {
  const household = await Household.findOne({
    _id: req.params.id,
    deletedAt: null,
  })
    .populate(
      "householdHead",
      "residentId firstName middleName lastName gender dateOfBirth"
    )
    .populate(
      "createdBy",
      "fullname username"
    );

  if (!household) {
    return res.status(404).json({
      success: false,
      message: "Household not found.",
    });
  }

  return res.json({
    success: true,
    data: household,
  });
};


const updateHousehold = async (req, res) => {
  const {
    compound,
    houseNumber,
    notes,
  } = req.body;

  const household = await Household.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

  if (!household) {
    return res.status(404).json({
      success: false,
      message: "Household not found.",
    });
  }

  if (compound !== undefined) {
    household.compound = compound.trim();
  }

  if (houseNumber !== undefined) {
    household.houseNumber = houseNumber.trim();
  }

  if (notes !== undefined) {
    household.notes = notes.trim();
  }

  household.updatedBy = req.user._id;

  await household.save();

  return res.json({
    success: true,
    message: "Household updated successfully.",
    data: household,
  });
};


const updateHouseholdGPS = async (req, res) => {
  const {
    latitude,
    longitude,
    accuracy,
  } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid latitude and longitude are required.",
    });
  }

  const household = await Household.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

  if (!household) {
    return res.status(404).json({
      success: false,
      message: "Household not found.",
    });
  }

  household.gps = {
    latitude,
    longitude,
    accuracy,
    capturedAt: new Date(),
  };

  household.updatedBy = req.user._id;

  await household.save();

  return res.json({
    success: true,
    message: "Household GPS location updated successfully.",
    data: household.gps,
  });
};


const deleteHousehold = async (req, res) => {
  const household = await Household.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

  if (!household) {
    return res.status(404).json({
      success: false,
      message: "Household not found.",
    });
  }

  household.deletedAt = new Date();
  household.status = "inactive";
  household.updatedBy = req.user._id;

  await household.save();

  return res.json({
    success: true,
    message: "Household archived successfully.",
  });
};

const getHouseholdTree = async (req, res) => {
  try {
    const household = await Household.findOne({
      _id: req.params.id,
      deletedAt: null,
      status: "active",
    }).select(
      "householdId community lga state country compound houseNumber householdHead"
    );

    if (!household) {
      return res.status(404).json({
        success: false,
        message: "Household not found.",
      });
    }

    const residents = await Resident.find({
      household: household._id,
      deletedAt: null,
      status: "active",
    }).select(
      "residentId firstName middleName lastName gender dateOfBirth relationshipToHead verificationStatus"
    );

    const relationships = await Relationship.find({
      household: household._id,
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

    const members = residents.map((resident) => ({
      id: resident._id,
      residentId: resident.residentId,

      name: [
        resident.firstName,
        resident.middleName,
        resident.lastName,
      ]
        .filter(Boolean)
        .join(" "),

      gender: resident.gender,

      dateOfBirth: resident.dateOfBirth,

      relationshipToHead:
        resident.relationshipToHead,

      verificationStatus:
        resident.verificationStatus,

      isHead:
        household.householdHead &&
        household.householdHead.toString() ===
          resident._id.toString(),
    }));

    const treeRelationships =
      relationships.map((relationship) => ({
        id: relationship._id,

        from: relationship.fromResident
          ? relationship.fromResident._id
          : null,

        to: relationship.toResident
          ? relationship.toResident._id
          : null,

        relationship:
          relationship.relationship,
      }));

    return res.json({
      success: true,

      data: {
        household: {
          id: household._id,
          householdId:
            household.householdId,
          community:
            household.community,
          lga: household.lga,
          state: household.state,
          country: household.country,
          compound:
            household.compound,
          houseNumber:
            household.houseNumber,
        },

        memberCount:
          members.length,

        members,

        relationships:
          treeRelationships,
      },
    });

  } catch (error) {
    console.error(
      "HOUSEHOLD TREE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate household relationship tree.",
    });
  }
};

module.exports = {
  createHousehold,
  getHouseholds,
  getHouseholdById,
  updateHousehold,
  getHouseholdTree,
  updateHouseholdGPS,
  deleteHousehold,
};