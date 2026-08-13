const Household = require("../models/Household");
const Resident = require("../models/Resident");

exports.getHouseholdMapMarkers = async (req, res) => {
  try {
    const households = await Household.find({
      deletedAt: null,
      "location.latitude": {
        $ne: null,
      },
      "location.longitude": {
        $ne: null,
      },
    })
      .select(
        "_id householdId location community lga state country compound houseNumber"
      )
      .lean();

    const householdIds = households.map(
      (household) => household._id
    );

    const residentCounts = await Resident.aggregate([
      {
        $match: {
          household: {
            $in: householdIds,
          },
          deletedAt: null,
          status: "active",
        },
      },

      {
        $group: {
          _id: "$household",

          residentCount: {
            $sum: 1,
          },

          verifiedCount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$verificationStatus",
                    "verified",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const countsMap = new Map(
      residentCounts.map((item) => [
        item._id.toString(),
        {
          residentCount: item.residentCount,
          verifiedCount: item.verifiedCount,
        },
      ])
    );

    const markers = households.map((household) => {
      const counts =
        countsMap.get(
          household._id.toString()
        ) || {
          residentCount: 0,
          verifiedCount: 0,
        };

      return {
        // MongoDB document ID
        _id: household._id,

        // Human-readable TA-HOSS household ID
        householdId: household.householdId,

        // GPS information
        latitude:
          household.location?.latitude ?? null,

        longitude:
          household.location?.longitude ?? null,

        accuracy:
          household.location?.accuracy ?? null,

        capturedAt:
          household.location?.capturedAt ?? null,

        captureMethod:
          household.location?.captureMethod ?? null,

        // Household information
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

        // Resident statistics
        residentCount:
          counts.residentCount,

        verifiedCount:
          counts.verifiedCount,
      };
    });

    return res.json({
      success: true,

      community: {
        name: "Ta-hoss Community",
        lga: "Riyom",
        state: "Plateau",
        country: "Nigeria",
      },

      totalMappedHouseholds:
        markers.length,

      data: markers,
    });

  } catch (error) {
    console.error(
      "MAP MARKERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve household map data.",
    });
  }
};