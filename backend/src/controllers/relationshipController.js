const Relationship = require("../models/Relationship");
const Resident = require("../models/Resident");


const allowedRelationships = [
  "spouse",
  "child",
  "parent",
  "sibling",
  "grandparent",
  "grandchild",
  "relative",
  "other",
];


const createRelationship = async (req, res) => {
  try {
    const {
      toResident,
      relationship,
    } = req.body;

    if (!toResident || !relationship) {
      return res.status(400).json({
        success: false,
        message:
          "The related resident and relationship are required.",
      });
    }

    if (!allowedRelationships.includes(relationship)) {
      return res.status(400).json({
        success: false,
        message: "Invalid relationship type.",
      });
    }

    const fromResident =
      await Resident.findOne({
        _id: req.params.id,
        deletedAt: null,
        status: "active",
      });

    const targetResident =
      await Resident.findOne({
        _id: toResident,
        deletedAt: null,
        status: "active",
      });

    if (!fromResident || !targetResident) {
      return res.status(404).json({
        success: false,
        message:
          "One or both residents were not found.",
      });
    }

    if (
      fromResident._id.equals(
        targetResident._id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A resident cannot be related to themselves.",
      });
    }

    if (
      fromResident.household.toString() !==
      targetResident.household.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both residents must belong to the same household.",
      });
    }

    const relationshipRecord =
      await Relationship.create({
        household:
          fromResident.household,

        fromResident:
          fromResident._id,

        toResident:
          targetResident._id,

        relationship,

        createdBy:
          req.user._id,
      });

    const populated =
      await Relationship.findById(
        relationshipRecord._id
      )
        .populate(
          "fromResident",
          "residentId firstName middleName lastName"
        )
        .populate(
          "toResident",
          "residentId firstName middleName lastName"
        );

    return res.status(201).json({
      success: true,
      message:
        "Household relationship created successfully.",
      data: populated,
    });

  } catch (error) {

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This relationship already exists.",
      });
    }

    console.error(
      "CREATE RELATIONSHIP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create household relationship.",
    });
  }
};


const getResidentRelationships = async (
  req,
  res
) => {
  try {

    const resident =
      await Resident.findOne({
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

    const relationships =
      await Relationship.find({
        household: resident.household,
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
        )
        .sort({
          createdAt: 1,
        });

    return res.json({
      success: true,

      data: {
        resident: {
          id: resident._id,
          residentId:
            resident.residentId,
          name: `${resident.firstName} ${resident.lastName}`,
        },

        relationships,
      },
    });

  } catch (error) {

    console.error(
      "GET RELATIONSHIPS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve relationships.",
    });
  }
};


module.exports = {
  createRelationship,
  getResidentRelationships,
};