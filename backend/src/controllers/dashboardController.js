const User = require("../models/User");

const getDashboard = async (req, res) => {

    try {

        const totalAdmins = await User.countDocuments();

        res.json({

            success: true,

            dashboard: {

                totalAdmins,

                totalResidents: 0,

                totalHouseholds: 0,

                pendingSync: 0,

                gpsCoverage: "0%"

            }

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

module.exports = {

    getDashboard

};