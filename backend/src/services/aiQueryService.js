const Resident = require("../models/Resident");
const Household = require("../models/Household");

// =========================================================
// TA-HOSS AI QUERY SERVICE
// =========================================================
//
// PURPOSE
// ---------------------------------------------------------
// This service provides controlled, allowlisted database
// retrieval for TA-HOSS AI.
//
// IMPORTANT:
// - The AI never receives unrestricted MongoDB access.
// - The AI never constructs raw MongoDB queries.
// - Only explicitly supported query operations are allowed.
// - Query arguments are validated here.
// - Sensitive fields are deliberately excluded.
// - Database queries are defined only in this service.
// - The router decides authorization.
// - This service decides how an authorized operation is
//   executed.
//
// =========================================================


// =========================================================
// CONSTANTS
// =========================================================

const MAX_RESULTS = 50;


// =========================================================
// SAFE RESIDENT PROJECTIONS
// =========================================================
//
// Use operation-specific projections rather than one broad
// projection for every query.
//
// Sensitive fields such as:
// - password
// - authentication credentials
// - biometric templates
// - biometric references
// - QR tokens
// - photo URLs
// - private credentials
//
// are never exposed through this service.
//
// =========================================================

const RESIDENT_LIST_PROJECTION = {
  residentId: 1,
  firstName: 1,
  middleName: 1,
  lastName: 1,
  gender: 1,
  occupation: 1,
  educationLevel: 1,
  relationshipToHead: 1,
  verificationStatus: 1,
  identityStatus: 1,
  household: 1,
};

const RESIDENT_LOOKUP_PROJECTION = {
  residentId: 1,
  firstName: 1,
  middleName: 1,
  lastName: 1,
  gender: 1,
  dateOfBirth: 1,
  maritalStatus: 1,
  occupation: 1,
  educationLevel: 1,
  relationshipToHead: 1,
  verificationStatus: 1,
  identityStatus: 1,
  status: 1,
  household: 1,
  biometric: {
    enrolled: 1,
  },
};


// =========================================================
// SAFE HOUSEHOLD PROJECTIONS
// =========================================================
//
// GPS coordinates are intentionally NOT returned to the AI.
//
// The service may use GPS fields internally to determine
// mapping status, but raw coordinates are not exposed.
//
// =========================================================

const HOUSEHOLD_LIST_PROJECTION = {
  householdId: 1,
  community: 1,
  lga: 1,
  state: 1,
  country: 1,
  compound: 1,
  houseNumber: 1,
  householdHead: 1,
  status: 1,
};

const HOUSEHOLD_LOOKUP_PROJECTION = {
  householdId: 1,
  community: 1,
  lga: 1,
  state: 1,
  country: 1,
  compound: 1,
  houseNumber: 1,
  householdHead: 1,
  status: 1,
  location: {
    captureMethod: 1,
    accuracy: 1,
    capturedAt: 1,
  },
};


// =========================================================
// GENERAL HELPERS
// =========================================================

const cleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeString = (value) => {
  return cleanString(value).toLowerCase();
};

const residentName = (resident) => {
  return [
    resident.firstName,
    resident.middleName,
    resident.lastName,
  ]
    .filter(Boolean)
    .join(" ");
};

const isValidResidentStatus = (status) => {
  return ["active", "inactive"].includes(status);
};

const isValidVerificationStatus = (status) => {
  return ["verified", "pending", "rejected"].includes(status);
};

const isValidGender = (gender) => {
  return ["male", "female", "other"].includes(gender);
};


// =========================================================
// QUERY RESULT HELPERS
// =========================================================

const buildListMetadata = (count, results) => {
  return {
    count,
    returnedCount: results.length,
    truncated: count > results.length,
  };
};


// =========================================================
// QUERY: RESIDENTS BY GENDER
// =========================================================
//
// Supports:
//
// "Show female residents"
// "Show male residents"
// "Show female residents awaiting verification"
//
// The verificationStatus argument is deliberately supported
// here so compound queries remain ONE MongoDB query.
//
// =========================================================

const queryResidentsByGender = async (
  gender,
  verificationStatus = null
) => {
  const normalizedGender = normalizeString(gender);

  if (!isValidGender(normalizedGender)) {
    throw new Error("Unsupported gender query.");
  }

  let normalizedVerificationStatus = null;

  if (verificationStatus !== null && verificationStatus !== undefined) {
    normalizedVerificationStatus =
      normalizeString(verificationStatus);

    if (
      !isValidVerificationStatus(
        normalizedVerificationStatus
      )
    ) {
      throw new Error(
        "Unsupported verification status query."
      );
    }
  }

  const filter = {
    deletedAt: null,
    status: "active",
    gender: normalizedGender,
  };

  if (normalizedVerificationStatus) {
    filter.verificationStatus =
      normalizedVerificationStatus;
  }

  const count = await Resident.countDocuments(filter);

  const residents = await Resident.find(filter)
    .select(RESIDENT_LIST_PROJECTION)
    .limit(MAX_RESULTS)
    .lean();

  const results = residents.map((resident) => ({
    residentId: resident.residentId,
    name: residentName(resident),
    gender: resident.gender,
    verificationStatus:
      resident.verificationStatus || null,
    identityStatus:
      resident.identityStatus || null,
    occupation:
      resident.occupation || null,
    educationLevel:
      resident.educationLevel || null,
    household: resident.household
      ? resident.household.toString()
      : null,
  }));

  return {
    type: "resident_gender",
    gender: normalizedGender,
    verificationStatus:
      normalizedVerificationStatus,
    ...buildListMetadata(count, results),
    results,
  };
};


// =========================================================
// QUERY: RESIDENTS BY VERIFICATION STATUS
// =========================================================

const queryResidentsByVerificationStatus = async (
  status
) => {
  const normalizedStatus = normalizeString(status);

  if (!isValidVerificationStatus(normalizedStatus)) {
    throw new Error(
      "Unsupported verification status query."
    );
  }

  const filter = {
    deletedAt: null,
    status: "active",
    verificationStatus: normalizedStatus,
  };

  const count = await Resident.countDocuments(filter);

  const residents = await Resident.find(filter)
    .select(RESIDENT_LIST_PROJECTION)
    .limit(MAX_RESULTS)
    .lean();

  const results = residents.map((resident) => ({
    residentId: resident.residentId,
    name: residentName(resident),
    gender: resident.gender,
    relationshipToHead:
      resident.relationshipToHead || null,
    verificationStatus:
      resident.verificationStatus || null,
    identityStatus:
      resident.identityStatus || null,
    household: resident.household
      ? resident.household.toString()
      : null,
  }));

  return {
    type: "residents_by_verification_status",
    status: normalizedStatus,
    ...buildListMetadata(count, results),
    results,
  };
};


// =========================================================
// QUERY: VERIFICATION SUMMARY
// =========================================================

const queryVerificationStatus = async () => {
  const [
    total,
    verified,
    pending,
    rejected,
  ] = await Promise.all([
    Resident.countDocuments({
      deletedAt: null,
      status: "active",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      verificationStatus: "verified",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      verificationStatus: "pending",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      verificationStatus: "rejected",
    }),
  ]);

  return {
    type: "verification_summary",

    total,
    verified,
    pending,
    rejected,

    verificationRate:
      total > 0
        ? Number(
            ((verified / total) * 100).toFixed(2)
          )
        : 0,
  };
};


// =========================================================
// QUERY: HOUSEHOLDS WITHOUT HEAD
// =========================================================

const queryHouseholdsWithoutHead = async () => {
  const filter = {
    deletedAt: null,
    status: "active",
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
  };

  const count =
    await Household.countDocuments(filter);

  const households = await Household.find(filter)
    .select(HOUSEHOLD_LIST_PROJECTION)
    .limit(MAX_RESULTS)
    .lean();

  const results = households.map((household) => ({
    householdId:
      household.householdId,

    compound:
      household.compound || null,

    houseNumber:
      household.houseNumber || null,

    community:
      household.community || null,

    mapped:
      household.location?.latitude != null &&
      household.location?.longitude != null,
  }));

  return {
    type: "households_without_head",
    ...buildListMetadata(count, results),
    results,
  };
};


// =========================================================
// QUERY: UNMAPPED HOUSEHOLDS
// =========================================================

const queryUnmappedHouseholds = async () => {
  const filter = {
    deletedAt: null,
    status: "active",
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
  };

  const count =
    await Household.countDocuments(filter);

  const households = await Household.find(filter)
    .select(HOUSEHOLD_LIST_PROJECTION)
    .limit(MAX_RESULTS)
    .lean();

  const results = households.map((household) => ({
    householdId:
      household.householdId,

    compound:
      household.compound || null,

    houseNumber:
      household.houseNumber || null,

    community:
      household.community || null,

    mapped: false,
  }));

  return {
    type: "unmapped_households",
    ...buildListMetadata(count, results),
    results,
  };
};


// =========================================================
// QUERY: RESIDENT BY ID
// =========================================================

const queryResidentById = async (
  residentId
) => {
  const id = cleanString(residentId);

  if (!id) {
    throw new Error(
      "Resident ID is required."
    );
  }

  if (id.length > 100) {
    throw new Error(
      "Invalid resident ID."
    );
  }

  const resident =
    await Resident.findOne({
      residentId: id,
      deletedAt: null,
      status: "active",
    })
      .select(RESIDENT_LOOKUP_PROJECTION)
      .lean();

  if (!resident) {
    return {
      type: "resident_lookup",
      found: false,
      residentId: id,
      result: null,
    };
  }

  return {
    type: "resident_lookup",

    found: true,

    residentId: id,

    result: {
      residentId:
        resident.residentId,

      name:
        residentName(resident),

      gender:
        resident.gender || null,

      dateOfBirth:
        resident.dateOfBirth || null,

      maritalStatus:
        resident.maritalStatus || null,

      occupation:
        resident.occupation || null,

      educationLevel:
        resident.educationLevel || null,

      relationshipToHead:
        resident.relationshipToHead || null,

      verificationStatus:
        resident.verificationStatus || null,

      identityStatus:
        resident.identityStatus || null,

      biometricEnrolled:
        resident.biometric?.enrolled === true,

      status:
        resident.status || null,

      household:
        resident.household
          ? resident.household.toString()
          : null,
    },
  };
};


// =========================================================
// QUERY: HOUSEHOLD BY ID
// =========================================================

const queryHouseholdById = async (
  householdId
) => {
  const id = cleanString(householdId);

  if (!id) {
    throw new Error(
      "Household ID is required."
    );
  }

  if (id.length > 100) {
    throw new Error(
      "Invalid household ID."
    );
  }

  const household =
    await Household.findOne({
      householdId: id,
      deletedAt: null,
      status: "active",
    })
      .select(HOUSEHOLD_LOOKUP_PROJECTION)
      .lean();

  if (!household) {
    return {
      type: "household_lookup",
      found: false,
      householdId: id,
      result: null,
    };
  }

  const residentCount =
    await Resident.countDocuments({
      household: household._id,
      deletedAt: null,
      status: "active",
    });

  const mapped =
    household.location?.latitude != null &&
    household.location?.longitude != null;

  return {
    type: "household_lookup",

    found: true,

    householdId: id,

    result: {
      householdId:
        household.householdId,

      community:
        household.community || null,

      lga:
        household.lga || null,

      state:
        household.state || null,

      country:
        household.country || null,

      compound:
        household.compound || null,

      houseNumber:
        household.houseNumber || null,

      hasHouseholdHead:
        household.householdHead != null,

      mapped,

      captureMethod:
        household.location?.captureMethod ||
        null,

      residentCount,
    },
  };
};


// =========================================================
// QUERY: IDENTITY STATUS
// =========================================================

const queryIdentityStatus = async () => {
  const [
    active,
    pending,
    suspended,
    deceased,
    moved,
  ] = await Promise.all([
    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      identityStatus: "active",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      identityStatus: "pending",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      identityStatus: "suspended",
    }),

    Resident.countDocuments({
      deletedAt: null,
      identityStatus: "deceased",
    }),

    Resident.countDocuments({
      deletedAt: null,
      identityStatus: "moved",
    }),
  ]);

  return {
    type: "identity_summary",

    active,
    pending,
    suspended,
    deceased,
    moved,
  };
};


// =========================================================
// QUERY: GPS COVERAGE
// =========================================================

const queryGpsCoverage = async () => {
  const [
    total,
    mapped,
    unmapped,
  ] = await Promise.all([
    Household.countDocuments({
      deletedAt: null,
      status: "active",
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
      "location.latitude": {
        $ne: null,
      },
      "location.longitude": {
        $ne: null,
      },
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
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
    }),
  ]);

  return {
    type: "gps_summary",

    totalHouseholds: total,

    mappedHouseholds: mapped,

    unmappedHouseholds: unmapped,

    coverageRate:
      total > 0
        ? Number(
            ((mapped / total) * 100).toFixed(2)
          )
        : 0,
  };
};


// =========================================================
// QUERY: DATA QUALITY
// =========================================================

const queryDataQuality = async () => {
  const [
    residentsWithoutPhone,
    residentsWithoutOccupation,
    residentsWithoutEducation,
    householdsWithoutHead,
    unmappedHouseholds,
    pendingVerification,
  ] = await Promise.all([
    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      $or: [
        {
          phoneNumber: "",
        },
        {
          phoneNumber: null,
        },
        {
          phoneNumber: {
            $exists: false,
          },
        },
      ],
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      $or: [
        {
          occupation: "",
        },
        {
          occupation: null,
        },
        {
          occupation: {
            $exists: false,
          },
        },
      ],
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      $or: [
        {
          educationLevel: "",
        },
        {
          educationLevel: null,
        },
        {
          educationLevel: {
            $exists: false,
          },
        },
      ],
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
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
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
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
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      verificationStatus: "pending",
    }),
  ]);

  return {
    type: "data_quality",

    residentsWithoutPhone,

    residentsWithoutOccupation,

    residentsWithoutEducation,

    householdsWithoutHead,

    unmappedHouseholds,

    pendingVerification,
  };
};


// =========================================================
// QUERY: HOUSEHOLD SUMMARY
// =========================================================
//
// This operation provides high-level household statistics.
// It does not expose individual household records.
//
// =========================================================

const queryHouseholdSummary = async () => {
  const [
    totalHouseholds,
    activeHouseholds,
    householdsWithHead,
    householdsWithoutHead,
    mappedHouseholds,
    unmappedHouseholds,
  ] = await Promise.all([
    Household.countDocuments({
      deletedAt: null,
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
      householdHead: {
        $ne: null,
      },
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
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
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
      "location.latitude": {
        $ne: null,
      },
      "location.longitude": {
        $ne: null,
      },
    }),

    Household.countDocuments({
      deletedAt: null,
      status: "active",
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
    }),
  ]);

  return {
    type: "household_summary",

    totalHouseholds,

    activeHouseholds,

    householdsWithHead,

    householdsWithoutHead,

    mappedHouseholds,

    unmappedHouseholds,

    gpsCoverageRate:
      activeHouseholds > 0
        ? Number(
            (
              (mappedHouseholds /
                activeHouseholds) *
              100
            ).toFixed(2)
          )
        : 0,
  };
};


// =========================================================
// QUERY: RESIDENT DEMOGRAPHICS
// =========================================================

const queryResidentDemographics = async () => {
  const [
    total,
    male,
    female,
    other,
  ] = await Promise.all([
    Resident.countDocuments({
      deletedAt: null,
      status: "active",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      gender: "male",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      gender: "female",
    }),

    Resident.countDocuments({
      deletedAt: null,
      status: "active",
      gender: "other",
    }),
  ]);

  return {
    type: "resident_demographics",

    total,

    gender: {
      male,
      female,
      other,
    },

    percentages: {
      male:
        total > 0
          ? Number(
              ((male / total) * 100).toFixed(2)
            )
          : 0,

      female:
        total > 0
          ? Number(
              ((female / total) * 100).toFixed(2)
            )
          : 0,

      other:
        total > 0
          ? Number(
              ((other / total) * 100).toFixed(2)
            )
          : 0,
    },
  };
};


// =========================================================
// QUERY: AGE INTELLIGENCE
// =========================================================
//
// Age groups:
//
// 0-4
// 5-14
// 15-24
// 25-44
// 45-64
// 65+
//
// Residents without a valid date of birth are not assigned
// to an age group.
//
// =========================================================

const queryAgeIntelligence = async () => {
  const residents =
    await Resident.find({
      deletedAt: null,
      status: "active",
      dateOfBirth: {
        $ne: null,
      },
    })
      .select({
        dateOfBirth: 1,
      })
      .lean();

  const today = new Date();

  const groups = {
    "0_4": 0,
    "5_14": 0,
    "15_24": 0,
    "25_44": 0,
    "45_64": 0,
    "65_plus": 0,
  };

  let validDateOfBirths = 0;

  for (const resident of residents) {
    const dob = new Date(
      resident.dateOfBirth
    );

    if (Number.isNaN(dob.getTime())) {
      continue;
    }

    let age =
      today.getFullYear() -
      dob.getFullYear();

    const monthDifference =
      today.getMonth() -
      dob.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < dob.getDate()
      )
    ) {
      age--;
    }

    if (age < 0) {
      continue;
    }

    validDateOfBirths++;

    if (age <= 4) {
      groups["0_4"]++;
    } else if (age <= 14) {
      groups["5_14"]++;
    } else if (age <= 24) {
      groups["15_24"]++;
    } else if (age <= 44) {
      groups["25_44"]++;
    } else if (age <= 64) {
      groups["45_64"]++;
    } else {
      groups["65_plus"]++;
    }
  }

  return {
    type: "age_intelligence",

    totalActiveResidents:
      await Resident.countDocuments({
        deletedAt: null,
        status: "active",
      }),

    residentsWithValidDateOfBirth:
      validDateOfBirths,

    residentsWithoutUsableDateOfBirth:
      await Resident.countDocuments({
        deletedAt: null,
        status: "active",
        $or: [
          {
            dateOfBirth: null,
          },
          {
            dateOfBirth: {
              $exists: false,
            },
          },
        ],
      }),

    ageGroups: groups,
  };
};


// =========================================================
// MAIN CONTROLLED QUERY EXECUTOR
// =========================================================
//
// IMPORTANT:
//
// The caller supplies ONLY:
// - operation
// - arguments
//
// This function decides whether the operation is supported.
//
// There is no dynamic MongoDB operation selection.
//
// =========================================================

const executeAIQuery = async ({
  operation,
  args = {},
}) => {
  if (
    !operation ||
    typeof operation !== "string"
  ) {
    throw new Error(
      "AI query operation is required."
    );
  }

  if (
    !args ||
    typeof args !== "object" ||
    Array.isArray(args)
  ) {
    throw new Error(
      "AI query arguments must be an object."
    );
  }

  const allowedOperations = {
    residents_by_gender: () =>
      queryResidentsByGender(
        args.gender,
        args.verificationStatus
      ),

    residents_by_verification_status: () =>
      queryResidentsByVerificationStatus(
        args.status
      ),

    verification_summary: () =>
      queryVerificationStatus(),

    households_without_head: () =>
      queryHouseholdsWithoutHead(),

    unmapped_households: () =>
      queryUnmappedHouseholds(),

    resident_by_id: () =>
      queryResidentById(
        args.residentId
      ),

    household_by_id: () =>
      queryHouseholdById(
        args.householdId
      ),

    identity_summary: () =>
      queryIdentityStatus(),

    gps_summary: () =>
      queryGpsCoverage(),

    data_quality: () =>
      queryDataQuality(),

    household_summary: () =>
      queryHouseholdSummary(),

    resident_demographics: () =>
      queryResidentDemographics(),

    age_intelligence: () =>
      queryAgeIntelligence(),
  };

  const executor =
    allowedOperations[operation];

  if (!executor) {
    throw new Error(
      `Unsupported AI database operation: ${operation}`
    );
  }

  return executor();
};


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  executeAIQuery,

  queryResidentsByGender,
  queryResidentsByVerificationStatus,
  queryVerificationStatus,

  queryHouseholdsWithoutHead,
  queryUnmappedHouseholds,

  queryResidentById,
  queryHouseholdById,

  queryIdentityStatus,
  queryGpsCoverage,
  queryDataQuality,

  queryHouseholdSummary,
  queryResidentDemographics,
  queryAgeIntelligence,
};