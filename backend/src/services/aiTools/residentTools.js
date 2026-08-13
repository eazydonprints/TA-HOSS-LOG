const Resident = require("../../models/Resident");

// =========================================================
// RESIDENT AI TOOLS
// =========================================================
// Read-only retrieval tools for TA-HOSS AI.
//
// SECURITY:
// - Only active records are returned.
// - Soft-deleted records are excluded.
// - Sensitive authentication information is never returned.
// - Biometric templateReference is NEVER returned.
// - photoPublicId is NEVER returned.
// =========================================================

// ---------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------

const MAX_LIMIT = 20;

const ALLOWED_GENDERS = [
  "male",
  "female",
  "other",
];

const ALLOWED_VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
];

const ALLOWED_IDENTITY_STATUSES = [
  "pending",
  "active",
  "suspended",
  "deceased",
  "moved",
];

// ---------------------------------------------------------
// SANITIZE RESIDENT
// ---------------------------------------------------------

const sanitizeResident = (resident) => {
  if (!resident) {
    return null;
  }

  const household =
    resident.household &&
    typeof resident.household === "object"
      ? {
          householdId:
            resident.household.householdId ||
            null,

          compound:
            resident.household.compound ||
            null,

          houseNumber:
            resident.household.houseNumber ||
            null,
        }
      : resident.household || null;

  return {
    residentId: resident.residentId,

    name: [
      resident.firstName,
      resident.middleName,
      resident.lastName,
    ]
      .filter(Boolean)
      .join(" "),

    firstName:
      resident.firstName || null,

    middleName:
      resident.middleName || null,

    lastName:
      resident.lastName || null,

    gender:
      resident.gender || null,

    dateOfBirth:
      resident.dateOfBirth || null,

    phoneNumber:
      resident.phoneNumber || null,

    maritalStatus:
      resident.maritalStatus || "unknown",

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
      Boolean(
        resident.biometric?.enrolled
      ),

    status:
      resident.status || null,

    household,

    gps:
      resident.gps?.latitude != null &&
      resident.gps?.longitude != null
        ? {
            latitude:
              resident.gps.latitude,

            longitude:
              resident.gps.longitude,

            accuracy:
              resident.gps.accuracy ??
              null,

            capturedAt:
              resident.gps.capturedAt ??
              null,
          }
        : null,

    identityIssuedAt:
      resident.identityIssuedAt || null,

    createdAt:
      resident.createdAt || null,

    updatedAt:
      resident.updatedAt || null,
  };
};

// ---------------------------------------------------------
// COMMON ACTIVE FILTER
// ---------------------------------------------------------

const activeResidentFilter = {
  deletedAt: null,
  status: "active",
};

// ---------------------------------------------------------
// SAFE LIMIT
// ---------------------------------------------------------

const normalizeLimit = (limit) => {
  const parsed =
    Number(limit);

  if (!Number.isFinite(parsed)) {
    return MAX_LIMIT;
  }

  return Math.min(
    Math.max(
      Math.floor(parsed),
      1
    ),
    MAX_LIMIT
  );
};

// ---------------------------------------------------------
// ESCAPE REGEX
// ---------------------------------------------------------

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ---------------------------------------------------------
// BUILD COMPOUND FILTER
// ---------------------------------------------------------

const buildResidentFilter = ({
  gender,
  verificationStatus,
  identityStatus,
  biometricEnrolled,
} = {}) => {
  const filter = {
    ...activeResidentFilter,
  };

  if (gender) {
    const normalized =
      String(gender)
        .trim()
        .toLowerCase();

    if (
      ALLOWED_GENDERS.includes(
        normalized
      )
    ) {
      filter.gender =
        normalized;
    }
  }

  if (verificationStatus) {
    const normalized =
      String(
        verificationStatus
      )
        .trim()
        .toLowerCase();

    if (
      ALLOWED_VERIFICATION_STATUSES.includes(
        normalized
      )
    ) {
      filter.verificationStatus =
        normalized;
    }
  }

  if (identityStatus) {
    const normalized =
      String(identityStatus)
        .trim()
        .toLowerCase();

    if (
      ALLOWED_IDENTITY_STATUSES.includes(
        normalized
      )
    ) {
      filter.identityStatus =
        normalized;
    }
  }

  if (
    typeof biometricEnrolled ===
    "boolean"
  ) {
    filter[
      "biometric.enrolled"
    ] = biometricEnrolled;
  }

  return filter;
};

// ---------------------------------------------------------
// FIND RESIDENT BY ID
// ---------------------------------------------------------

const findResidentById = async (
  residentId
) => {
  if (
    !residentId ||
    typeof residentId !== "string"
  ) {
    return {
      found: false,
      message:
        "A resident ID is required.",
    };
  }

  const normalizedId =
    residentId
      .trim()
      .toUpperCase();

  const resident =
    await Resident.findOne({
      ...activeResidentFilter,
      residentId:
        normalizedId,
    })
      .populate(
        "household",
        "householdId compound houseNumber"
      )
      .lean();

  if (!resident) {
    return {
      found: false,
      residentId:
        normalizedId,
      message:
        "No active resident with that ID was found in the TA-HOSS database.",
    };
  }

  return {
    found: true,

    resident:
      sanitizeResident(
        resident
      ),
  };
};

// ---------------------------------------------------------
// FIND RESIDENTS BY NAME
// ---------------------------------------------------------

const findResidentsByName = async ({
  name,
  limit = MAX_LIMIT,
} = {}) => {
  if (
    !name ||
    typeof name !== "string"
  ) {
    return {
      found: false,
      count: 0,
      totalMatching: 0,
      returned: 0,
      limited: false,
      residents: [],
      message:
        "A resident name is required.",
    };
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    return {
      found: false,
      count: 0,
      totalMatching: 0,
      returned: 0,
      limited: false,
      residents: [],
      message:
        "A resident name is required.",
    };
  }

  const safeLimit =
    normalizeLimit(limit);

  const regex =
    new RegExp(
      escapeRegex(cleanName),
      "i"
    );

  const filter = {
    ...activeResidentFilter,

    $or: [
      {
        firstName: regex,
      },
      {
        middleName: regex,
      },
      {
        lastName: regex,
      },
    ],
  };

  const totalMatching =
    await Resident.countDocuments(
      filter
    );

  const residents =
    await Resident.find(filter)
      .populate(
        "household",
        "householdId compound houseNumber"
      )
      .limit(safeLimit)
      .lean();

  return {
    found:
      totalMatching > 0,

    count:
      totalMatching,

    totalMatching,

    returned:
      residents.length,

    limited:
      totalMatching >
      residents.length,

    limitedTo:
      safeLimit,

    residents:
      residents.map(
        sanitizeResident
      ),
  };
};

// ---------------------------------------------------------
// GET RESIDENTS BY GENDER
// ---------------------------------------------------------

const getResidentsByGender = async ({
  gender,
  limit = MAX_LIMIT,
} = {}) => {
  if (
    !gender ||
    typeof gender !== "string"
  ) {
    return {
      found: false,
      count: 0,
      residents: [],
      message:
        "Gender is required.",
    };
  }

  const normalizedGender =
    gender.trim().toLowerCase();

  if (
    !ALLOWED_GENDERS.includes(
      normalizedGender
    )
  ) {
    return {
      found: false,
      count: 0,
      residents: [],
      message:
        "Invalid gender. Allowed values are male, female, or other.",
    };
  }

  return getResidents({
    gender:
      normalizedGender,
    limit,
  });
};

// ---------------------------------------------------------
// GET RESIDENTS BY VERIFICATION STATUS
// ---------------------------------------------------------

const getResidentsByVerificationStatus =
  async ({
    verificationStatus,
    limit = MAX_LIMIT,
  } = {}) => {
    if (
      !verificationStatus ||
      typeof verificationStatus !==
        "string"
    ) {
      return {
        found: false,
        count: 0,
        residents: [],
        message:
          "Verification status is required.",
      };
    }

    const normalizedStatus =
      verificationStatus
        .trim()
        .toLowerCase();

    if (
      !ALLOWED_VERIFICATION_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return {
        found: false,
        count: 0,
        residents: [],
        message:
          "Invalid verification status.",
      };
    }

    return getResidents({
      verificationStatus:
        normalizedStatus,
      limit,
    });
  };

// ---------------------------------------------------------
// GENERAL COMPOUND RESIDENT QUERY
// ---------------------------------------------------------

const getResidents = async ({
  gender,
  verificationStatus,
  identityStatus,
  biometricEnrolled,
  limit = MAX_LIMIT,
} = {}) => {
  const safeLimit =
    normalizeLimit(limit);

  const filter =
    buildResidentFilter({
      gender,
      verificationStatus,
      identityStatus,
      biometricEnrolled,
    });

  const totalMatching =
    await Resident.countDocuments(
      filter
    );

  const residents =
    await Resident.find(filter)
      .populate(
        "household",
        "householdId compound houseNumber"
      )
      .limit(safeLimit)
      .lean();

  return {
    found:
      totalMatching > 0,

    count:
      totalMatching,

    totalMatching,

    returned:
      residents.length,

    limited:
      totalMatching >
      residents.length,

    limitedTo:
      safeLimit,

    filters: {
      gender:
        gender || null,

      verificationStatus:
        verificationStatus ||
        null,

      identityStatus:
        identityStatus ||
        null,

      biometricEnrolled:
        typeof biometricEnrolled ===
        "boolean"
          ? biometricEnrolled
          : null,
    },

    residents:
      residents.map(
        sanitizeResident
      ),
  };
};

// ---------------------------------------------------------
// RESIDENT COUNT
// ---------------------------------------------------------

const getResidentCount = async ({
  gender,
  verificationStatus,
  identityStatus,
  biometricEnrolled,
} = {}) => {
  const filter =
    buildResidentFilter({
      gender,
      verificationStatus,
      identityStatus,
      biometricEnrolled,
    });

  const count =
    await Resident.countDocuments(
      filter
    );

  return {
    count,

    filters: {
      gender:
        gender || null,

      verificationStatus:
        verificationStatus ||
        null,

      identityStatus:
        identityStatus ||
        null,

      biometricEnrolled:
        typeof biometricEnrolled ===
        "boolean"
          ? biometricEnrolled
          : null,
    },
  };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  sanitizeResident,

  findResidentById,

  findResidentsByName,

  getResidentsByGender,

  getResidentsByVerificationStatus,

  getResidents,

  getResidentCount,
};