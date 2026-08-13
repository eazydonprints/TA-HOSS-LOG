const mongoose = require("mongoose");
const Resident = require("../models/Resident");

const verifyResident = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resident ID.",
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
        message: "Resident not found.",
      });
    }

    if (resident.verificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        message: "Resident is already verified.",
      });
    }

    resident.verificationStatus = "verified";

    resident.verifiedBy = req.user._id;
    resident.verifiedAt = new Date();

    resident.identityStatus = "active";

    if (!resident.identityIssuedAt) {
      resident.identityIssuedAt = new Date();
    }

    resident.identityUpdatedAt = new Date();

    resident.rejectionReason = null;

    await resident.save();

    const updatedResident = await Resident.findById(
      resident._id
    )
      .populate(
        "household",
        "householdId compound houseNumber"
      )
      .populate(
        "registeredBy",
        "fullname username"
      )
      .populate(
        "verifiedBy",
        "fullname username"
      );

    return res.json({
      success: true,
      message: "Resident verified successfully.",
      data: updatedResident,
    });
  } catch (error) {
    console.error(
      "VERIFY RESIDENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify resident.",
    });
  }
};

const rejectResident = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required.",
      });
    }

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

    if (resident.verificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        message:
          "A verified resident cannot be rejected through the normal verification workflow.",
      });
    }

    resident.verificationStatus = "rejected";
    resident.verifiedBy = req.user._id;
    resident.verifiedAt = new Date();

    resident.identityStatus = "pending";
    resident.identityUpdatedAt = new Date();

    resident.rejectionReason = reason.trim();

    await resident.save();

    return res.json({
      success: true,
      message: "Resident rejected.",
      data: resident,
    });
  } catch (error) {
    console.error("REJECT RESIDENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject resident.",
    });
  }
};

const getPendingResidents = async (
  req,
  res
) => {
  try {
    const search =
      req.query.search?.trim();

    const filter = {
      verificationStatus: "pending",
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

    const residents =
      await Resident.find(filter)
        .populate(
          "household",
          "householdId compound houseNumber"
        )
        .populate(
          "registeredBy",
          "fullname username"
        )
        .sort({
          createdAt: 1,
        });

    return res.json({
      success: true,
      count: residents.length,
      data: residents,
    });
  } catch (error) {
    console.error(
      "GET PENDING RESIDENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load pending residents.",
    });
  }
};

module.exports = {
  verifyResident,
  rejectResident,
  getPendingResidents,
};