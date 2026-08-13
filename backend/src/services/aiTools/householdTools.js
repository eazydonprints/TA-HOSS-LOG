const Household = require("../../models/Household");
const Resident = require("../../models/Resident");

// =========================================================
// HOUSEHOLD AI TOOLS
// =========================================================
// Read-only household retrieval tools for TA-HOSS AI.
//
// These functions never create, modify or delete records.
// =========================================================

// ---------------------------------------------------------
// SANITIZE HOUSEHOLD
// ---------------------------------------------------------

const sanitizeHousehold = (
  household,
  residentCount = 0
) => {
  if (!household) {
    return null;
  }

  const hasGPS =
    household.location?.latitude !=
      null &&
    household.location?.longitude !=
      null;

  return {
    householdId:
      household.householdId,

    community:
      household.community ||
      "Ta-hoss",

    lga:
      household.lga ||
      "Riyom",

    state:
      household.state ||
      "Plateau",

    country:
      household.country ||
      "Nigeria",

    compound:
      household.compound || null,

    houseNumber:
      household.houseNumber || null,

    householdHead:
      household.householdHead
        ? typeof household.householdHead ===
          "object"
          ? {
              residentId:
                household.householdHead
                  .residentId ||
                null,

              name: [
                household.householdHead
                  .firstName,
                household.householdHead
                  .middleName,
                household.householdHead
                  .lastName,
              ]
                .filter(Boolean)
                .join(" "),
            }
          : household.householdHead
        : null,

    residentCount,

    gps: hasGPS
      ? {
          latitude:
            household.location
              .latitude,

          longitude:
            household.location
              .longitude,

          accuracy:
            household.location
              .accuracy ?? null,

          altitude:
            household.location
              .altitude ?? null,

          capturedAt:
            household.location
              .capturedAt ?? null,

          captureMethod:
            household.location
              .captureMethod ?? null,
        }
      : null,

    gpsMapped: hasGPS,

    status:
      household.status,

    notes:
      household.notes || null,

    createdAt:
      household.createdAt || null,

    updatedAt:
      household.updatedAt || null,
  };
};

// ---------------------------------------------------------
// COMMON FILTER
// ---------------------------------------------------------

const activeHouseholdFilter = {
  deletedAt: null,
  status: "active",
};

// ---------------------------------------------------------
// GET RESIDENT COUNTS FOR HOUSEHOLDS
// ---------------------------------------------------------

const getHouseholdResidentCounts = async (
  householdIds
) => {
  if (
    !Array.isArray(householdIds) ||
    householdIds.length === 0
  ) {
    return new Map();
  }

  const results =
    await Resident.aggregate([
      {
        $match: {
          deletedAt: null,
          status: "active",
          household: {
            $in: householdIds,
          },
        },
      },

      {
        $group: {
          _id: "$household",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  const countMap = new Map();

  results.forEach((item) => {
    countMap.set(
      item._id.toString(),
      item.count
    );
  });

  return countMap;
};

// ---------------------------------------------------------
// FIND HOUSEHOLD BY HOUSEHOLD ID
// ---------------------------------------------------------

const findHouseholdById = async (
  householdId
) => {
  if (
    !householdId ||
    typeof householdId !== "string"
  ) {
    return {
      found: false,
      message:
        "A household ID is required.",
    };
  }

  const household =
    await Household.findOne({
      ...activeHouseholdFilter,
      householdId:
        householdId.trim().toUpperCase(),
    })
      .populate(
        "householdHead",
        "residentId firstName middleName lastName"
      )
      .lean();

  if (!household) {
    return {
      found: false,
      householdId:
        householdId.trim().toUpperCase(),
      message:
        "No active household with that ID was found in the TA-HOSS database.",
    };
  }

  const countMap =
    await getHouseholdResidentCounts([
      household._id,
    ]);

  return {
    found: true,
    household: sanitizeHousehold(
      household,
      countMap.get(
        household._id.toString()
      ) || 0
    ),
  };
};

// ---------------------------------------------------------
// GET HOUSEHOLDS WITHOUT HOUSEHOLD HEAD
// ---------------------------------------------------------

const getHouseholdsWithoutHead = async ({
  limit = 20,
} = {}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    20
  );

  const households =
    await Household.find({
      ...activeHouseholdFilter,
      $or: [
        {
          householdHead: null,
        },
        {
          householdHead: {
            $exists: false,
          },
        },
      ],
    })
      .limit(safeLimit)
      .lean();

  const householdIds =
    households.map(
      (household) => household._id
    );

  const countMap =
    await getHouseholdResidentCounts(
      householdIds
    );

  return {
    found: households.length > 0,
    count: households.length,
    limitedTo: safeLimit,

    households:
      households.map((household) =>
        sanitizeHousehold(
          household,
          countMap.get(
            household._id.toString()
          ) || 0
        )
      ),
  };
};

// ---------------------------------------------------------
// GET UNMAPPED HOUSEHOLDS
// ---------------------------------------------------------

const getUnmappedHouseholds = async ({
  limit = 20,
} = {}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    20
  );

  const households =
    await Household.find({
      ...activeHouseholdFilter,

      $or: [
        {
          "location.latitude": null,
        },
        {
          "location.latitude": {
            $exists: false,
          },
        },
        {
          "location.longitude": null,
        },
        {
          "location.longitude": {
            $exists: false,
          },
        },
      ],
    })
      .limit(safeLimit)
      .lean();

  const householdIds =
    households.map(
      (household) => household._id
    );

  const countMap =
    await getHouseholdResidentCounts(
      householdIds
    );

  return {
    found: households.length > 0,
    count: households.length,
    limitedTo: safeLimit,

    households:
      households.map((household) =>
        sanitizeHousehold(
          household,
          countMap.get(
            household._id.toString()
          ) || 0
        )
      ),
  };
};

// ---------------------------------------------------------
// SEARCH HOUSEHOLDS
// ---------------------------------------------------------

const findHouseholds = async ({
  search,
  limit = 20,
} = {}) => {
  if (
    !search ||
    typeof search !== "string"
  ) {
    return {
      found: false,
      count: 0,
      households: [],
      message:
        "A household search term is required.",
    };
  }

  const cleanSearch =
    search.trim();

  if (!cleanSearch) {
    return {
      found: false,
      count: 0,
      households: [],
      message:
        "A household search term is required.",
    };
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    20
  );

  const regex = new RegExp(
    cleanSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    ),
    "i"
  );

  const households =
    await Household.find({
      ...activeHouseholdFilter,

      $or: [
        {
          householdId: regex,
        },
        {
          compound: regex,
        },
        {
          houseNumber: regex,
        },
      ],
    })
      .populate(
        "householdHead",
        "residentId firstName middleName lastName"
      )
      .limit(safeLimit)
      .lean();

  const householdIds =
    households.map(
      (household) => household._id
    );

  const countMap =
    await getHouseholdResidentCounts(
      householdIds
    );

  return {
    found: households.length > 0,
    count: households.length,
    limitedTo: safeLimit,

    households:
      households.map((household) =>
        sanitizeHousehold(
          household,
          countMap.get(
            household._id.toString()
          ) || 0
        )
      ),
  };
};

// ---------------------------------------------------------
// GET HOUSEHOLDS BY GPS STATUS
// ---------------------------------------------------------

const getHouseholdsByGPSStatus = async ({
  mapped,
  limit = 20,
} = {}) => {
  if (
    typeof mapped !== "boolean"
  ) {
    return {
      found: false,
      count: 0,
      households: [],
      message:
        "GPS mapped status must be true or false.",
    };
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    20
  );

  const filter = {
    ...activeHouseholdFilter,
  };

  if (mapped) {
    filter[
      "location.latitude"
    ] = {
      $ne: null,
    };

    filter[
      "location.longitude"
    ] = {
      $ne: null,
    };
  } else {
    filter.$or = [
      {
        "location.latitude": null,
      },
      {
        "location.latitude": {
          $exists: false,
        },
      },
      {
        "location.longitude": null,
      },
      {
        "location.longitude": {
          $exists: false,
        },
      },
    ];
  }

  const households =
    await Household.find(filter)
      .populate(
        "householdHead",
        "residentId firstName middleName lastName"
      )
      .limit(safeLimit)
      .lean();

  const householdIds =
    households.map(
      (household) => household._id
    );

  const countMap =
    await getHouseholdResidentCounts(
      householdIds
    );

  return {
    found: households.length > 0,
    count: households.length,
    mapped,
    limitedTo: safeLimit,

    households:
      households.map((household) =>
        sanitizeHousehold(
          household,
          countMap.get(
            household._id.toString()
          ) || 0
        )
      ),
  };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  sanitizeHousehold,
  findHouseholdById,
  findHouseholds,
  getHouseholdsWithoutHead,
  getUnmappedHouseholds,
  getHouseholdsByGPSStatus,
};