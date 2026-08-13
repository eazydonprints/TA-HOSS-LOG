const User = require("../models/User");
const Resident = require("../models/Resident");
const Household = require("../models/Household");

const getDashboard = async (req, res) => {
  try {

    const [
      totalAdmins,
      totalResidents,
      totalHouseholds,
      verifiedResidents,
      pendingResidents,
      mappedHouseholds
    ] = await Promise.all([

      User.countDocuments(),
      Resident.countDocuments(),
      Household.countDocuments(),
      Resident.countDocuments({
        verificationStatus: "verified"
      }),

      Resident.countDocuments({
        verificationStatus: {
          $ne: "verified"
        }
      }),

      Household.countDocuments({
        "gps.latitude": {
          $exists: true
        },
        "gps.longitude": {
          $exists: true
        }
      })

    ]);

    const gpsCoverage =
      totalHouseholds > 0
        ? `${Math.round(
            (mappedHouseholds / totalHouseholds) * 100
          )}%`
        : "0%";

    res.json({
      success: true,

      dashboard: {
        totalAdmins,
        totalResidents,
        totalHouseholds,
        verifiedResidents,
        pendingResidents,
        mappedHouseholds,
        gpsCoverage
      }
    });

  } catch (err) {

    console.error(
      "DASHBOARD ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

module.exports = {
  getDashboard
};