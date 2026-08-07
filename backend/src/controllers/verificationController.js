const Resident = require("../models/Resident");

const verifyResident = async (req, res) => {
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
      message: "Resident is already verified.",
    });
  }

  resident.verificationStatus = "verified";
  resident.verifiedBy = req.user._id;
  resident.verifiedAt = new Date();

  resident.identityStatus = "active";
  resident.identityIssuedAt = new Date();
  resident.identityUpdatedAt = new Date();

  resident.rejectionReason = null;

  await resident.save();

  return res.json({
    success: true,
    message: "Resident verified successfully.",
    data: resident,
  });
};


const rejectResident = async (req, res) => {
  const { reason } = req.body;

  if (
  resident.verificationStatus === "verified"
) {
  return res.status(400).json({
    success: false,
    message:
      "A verified resident cannot be rejected through the normal verification workflow.",
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
};


const getPendingResidents = async (req, res) => {
  const residents = await Resident.find({
    verificationStatus: "pending",
    deletedAt: null,
    status: "active",
  })
    .populate(
      "household",
      "householdId compound houseNumber"
    )
    .populate(
      "registeredBy",
      "fullname username"
    )
    .sort({ createdAt: 1 });

  return res.json({
    success: true,
    count: residents.length,
    data: residents,
  });
};


module.exports = {
  verifyResident,
  rejectResident,
  getPendingResidents,
};