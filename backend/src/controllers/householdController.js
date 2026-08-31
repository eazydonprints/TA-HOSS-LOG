const mongoose = require("mongoose");

const Household = require("../models/Household");
const Relationship = require("../models/Relationship");
const Resident = require("../models/Resident");

const generateHouseholdId = require("../utils/generateHouseholdId");
const getPagination = require("../utils/pagination");

/*
|--------------------------------------------------------------------------
| OBJECT ID VALIDATION HELPER
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| CREATE HOUSEHOLD
|--------------------------------------------------------------------------
*/

const createHousehold = async (req, res) => {
  try {
    const {
      compound,
      houseNumber,
      notes,
      latitude,
      longitude,
      accuracy,
    } = req.body;

    /*
     * Basic validation
     */

    const cleanedCompound =
      typeof compound === "string"
        ? compound.trim()
        : "";

    const cleanedHouseNumber =
      typeof houseNumber === "string"
        ? houseNumber.trim()
        : "";

    const cleanedNotes =
      typeof notes === "string"
        ? notes.trim()
        : "";

    if (!cleanedCompound) {
      return res.status(400).json({
        success: false,
        message:
          "Compound name is required.",
      });
    }

    if (!cleanedHouseNumber) {
      return res.status(400).json({
        success: false,
        message:
          "House number is required.",
      });
    }

    /*
     * GPS validation
     */

    let location;

    const hasLatitude =
      latitude !== undefined &&
      latitude !== null &&
      latitude !== "";

    const hasLongitude =
      longitude !== undefined &&
      longitude !== null &&
      longitude !== "";

    if (hasLatitude || hasLongitude) {
      if (!hasLatitude || !hasLongitude) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude and longitude must both be provided.",
        });
      }

      const parsedLatitude =
        Number(latitude);

      const parsedLongitude =
        Number(longitude);

      if (
        !Number.isFinite(
          parsedLatitude
        ) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid latitude.",
        });
      }

      if (
        !Number.isFinite(
          parsedLongitude
        ) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid longitude.",
        });
      }

      let parsedAccuracy = null;

      if (
        accuracy !== undefined &&
        accuracy !== null &&
        accuracy !== ""
      ) {
        parsedAccuracy =
          Number(accuracy);

        if (
          !Number.isFinite(
            parsedAccuracy
          ) ||
          parsedAccuracy < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid GPS accuracy.",
          });
        }
      }

      location = {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        accuracy: parsedAccuracy,
        altitude: null,
        capturedAt: new Date(),
        captureMethod: "gps",
      };
    }

    /*
     * Generate official household ID
     */

    const householdId =
      await generateHouseholdId();

    /*
     * Create record
     */

    const household =
      await Household.create({
        householdId,

        compound:
          cleanedCompound,

        houseNumber:
          cleanedHouseNumber,

        notes:
          cleanedNotes,

        location,

        createdBy:
          req.user?._id || null,
      });

    return res.status(201).json({
      success: true,

      message:
        "Household registered successfully.",

      data: household,
    });
  } catch (error) {
    console.error(
      "CREATE HOUSEHOLD ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A household with this information already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create household.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLDS
|--------------------------------------------------------------------------
*/

const getHouseholds = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search.trim()
        : "";

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

    const [
      households,
      total,
    ] = await Promise.all([
      Household.find(filter)
        .populate(
          "householdHead",
          "residentId firstName middleName lastName"
        )
        .populate(
          "createdBy",
          "fullname username"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Household.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,

      data: households,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          total > 0
            ? Math.ceil(
                total / limit
              )
            : 1,
      },
    });
  } catch (error) {
    console.error(
      "GET HOUSEHOLDS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve households.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD BY ID
|--------------------------------------------------------------------------
*/

const getHouseholdById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /*
     * IMPORTANT:
     *
     * Prevent values such as:
     * "register"
     * "tree"
     * "undefined"
     *
     * from being sent to MongoDB as ObjectIds.
     */

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOUSEHOLD_ID",
        message:
          "Invalid household ID.",
      });
    }

    const household =
      await Household.findOne({
        _id: id,
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
        message:
          "Household not found.",
      });
    }

    return res.json({
      success: true,
      data: household,
    });
  } catch (error) {
    console.error(
      "GET HOUSEHOLD BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve household.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD
|--------------------------------------------------------------------------
*/

const updateHousehold = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOUSEHOLD_ID",
        message:
          "Invalid household ID.",
      });
    }

    const {
      compound,
      houseNumber,
      notes,
    } = req.body;

    const household =
      await Household.findOne({
        _id: id,
        deletedAt: null,
      });

    if (!household) {
      return res.status(404).json({
        success: false,
        message:
          "Household not found.",
      });
    }

    if (compound !== undefined) {
      const cleanedCompound =
        String(compound).trim();

      if (!cleanedCompound) {
        return res.status(400).json({
          success: false,
          message:
            "Compound name cannot be empty.",
        });
      }

      household.compound =
        cleanedCompound;
    }

    if (houseNumber !== undefined) {
      const cleanedHouseNumber =
        String(
          houseNumber
        ).trim();

      if (!cleanedHouseNumber) {
        return res.status(400).json({
          success: false,
          message:
            "House number cannot be empty.",
        });
      }

      household.houseNumber =
        cleanedHouseNumber;
    }

    if (notes !== undefined) {
      household.notes =
        String(notes).trim();
    }

    household.updatedBy =
      req.user?._id || null;

    await household.save();

    return res.json({
      success: true,
      message:
        "Household updated successfully.",
      data: household,
    });
  } catch (error) {
    console.error(
      "UPDATE HOUSEHOLD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update household.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE / ARCHIVE HOUSEHOLD
|--------------------------------------------------------------------------
*/

const deleteHousehold = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOUSEHOLD_ID",
        message:
          "Invalid household ID.",
      });
    }

    const household =
      await Household.findOne({
        _id: id,
        deletedAt: null,
      });

    if (!household) {
      return res.status(404).json({
        success: false,
        message:
          "Household not found.",
      });
    }

    household.deletedAt =
      new Date();

    household.status =
      "inactive";

    household.updatedBy =
      req.user?._id || null;

    await household.save();

    return res.json({
      success: true,
      message:
        "Household archived successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE HOUSEHOLD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to archive household.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET HOUSEHOLD RELATIONSHIP TREE
|--------------------------------------------------------------------------
*/

const getHouseholdTree = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOUSEHOLD_ID",
        message:
          "Invalid household ID.",
      });
    }

    const household =
      await Household.findOne({
        _id: id,
        deletedAt: null,
        status: "active",
      }).select(
        "householdId community lga state country compound houseNumber householdHead"
      );

    if (!household) {
      return res.status(404).json({
        success: false,
        message:
          "Household not found.",
      });
    }

    const residents =
      await Resident.find({
        household:
          household._id,
        deletedAt: null,
        status: "active",
      }).select(
        "residentId firstName middleName lastName gender dateOfBirth relationshipToHead verificationStatus"
      );

    const relationships =
      await Relationship.find({
        household:
          household._id,
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

    const members =
      residents.map(
        (resident) => ({
          id: resident._id,

          residentId:
            resident.residentId,

          name: [
            resident.firstName,
            resident.middleName,
            resident.lastName,
          ]
            .filter(Boolean)
            .join(" "),

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

          relationshipToHead:
            resident.relationshipToHead,

          verificationStatus:
            resident.verificationStatus,

          isHead:
            Boolean(
              household.householdHead &&
              household.householdHead.toString() ===
                resident._id.toString()
            ),
        })
      );

    const treeRelationships =
      relationships.map(
        (relationship) => ({
          id:
            relationship._id,

          from:
            relationship.fromResident
              ? relationship
                  .fromResident
                  ._id
              : null,

          to:
            relationship.toResident
              ? relationship
                  .toResident
                  ._id
              : null,

          relationship:
            relationship.relationship,

          type:
            relationship.relationship,
        })
      );

    return res.json({
      success: true,

      data: {
        household: {
          id:
            household._id,

          householdId:
            household.householdId,

          community:
            household.community,

          lga:
            household.lga,

          state:
            household.state,

          country:
            household.country,

          compound:
            household.compound,

          houseNumber:
            household.houseNumber,

          householdHead:
            household.householdHead,
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

/*
|--------------------------------------------------------------------------
| UPDATE HOUSEHOLD GPS
|--------------------------------------------------------------------------
*/

const updateHouseholdGPS = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOUSEHOLD_ID",
        message:
          "Invalid household ID.",
      });
    }

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      captureMethod,
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and longitude are required.",
      });
    }

    const parsedLatitude =
      Number(latitude);

    const parsedLongitude =
      Number(longitude);

    if (
      !Number.isFinite(
        parsedLatitude
      ) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid latitude.",
      });
    }

    if (
      !Number.isFinite(
        parsedLongitude
      ) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid longitude.",
      });
    }

    let parsedAccuracy = null;

    if (
      accuracy !== undefined &&
      accuracy !== null &&
      accuracy !== ""
    ) {
      parsedAccuracy =
        Number(accuracy);

      if (
        !Number.isFinite(
          parsedAccuracy
        ) ||
        parsedAccuracy < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid GPS accuracy.",
        });
      }
    }

    let parsedAltitude = null;

    if (
      altitude !== undefined &&
      altitude !== null &&
      altitude !== ""
    ) {
      parsedAltitude =
        Number(altitude);

      if (
        !Number.isFinite(
          parsedAltitude
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid GPS altitude.",
        });
      }
    }

    const allowedMethods = [
      "gps",
      "manual",
      "offline_gps",
    ];

    if (
      captureMethod &&
      !allowedMethods.includes(
        captureMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid GPS capture method.",
      });
    }

    const household =
      await Household.findOne({
        _id: id,
        deletedAt: null,
      });

    if (!household) {
      return res.status(404).json({
        success: false,
        message:
          "Household not found.",
      });
    }

    household.location = {
      latitude:
        parsedLatitude,

      longitude:
        parsedLongitude,

      accuracy:
        parsedAccuracy,

      altitude:
        parsedAltitude,

      capturedAt:
        new Date(),

      captureMethod:
        captureMethod ||
        "gps",
    };

    household.updatedBy =
      req.user?._id || null;

    await household.save();

    return res.json({
      success: true,

      message:
        "Household GPS location updated successfully.",

      data: {
        householdId:
          household.householdId,

        location:
          household.location,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE GPS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update household GPS location.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createHousehold,
  getHouseholds,
  getHouseholdById,
  updateHousehold,
  updateHouseholdGPS,
  deleteHousehold,
  getHouseholdTree,
};