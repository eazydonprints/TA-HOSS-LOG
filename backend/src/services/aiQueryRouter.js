const residentTools = require("./aiTools/residentTools");
const householdTools = require("./aiTools/householdTools");

// =========================================================
// TA-HOSS AI QUERY ROUTER
// =========================================================
// Phase 1.6.3
//
// Purpose:
// Convert natural-language TA-HOSS questions into controlled,
// read-only retrieval operations.
//
// IMPORTANT:
// - This router NEVER writes to MongoDB.
// - This router NEVER modifies records.
// - This router NEVER generates MongoDB queries from AI output.
// - Only explicitly supported operations are allowed.
// - All database retrieval remains inside the tool modules.
// - Compound list queries are rejected when the current
//   retrieval layer cannot safely answer them.
// =========================================================

// =========================================================
// CONFIGURATION
// =========================================================

const MAX_RESULTS = 20;

const ALLOWED_ROLES = [
  "super_admin",
  "registration_officer",
  "verification_officer",
  "viewer",
];

// =========================================================
// NORMALIZATION
// =========================================================

const normalizeText = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

// =========================================================
// SECURITY / AUTHORIZATION
// =========================================================

const checkAuthorization = (user) => {
  if (!user || user.authenticated === false) {
    return {
      allowed: false,
      message:
        "TA-HOSS AI requires an authenticated user.",
    };
  }

  const role = user.role;

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return {
      allowed: false,
      message:
        "Your TA-HOSS account is not authorized to use database retrieval through the AI assistant.",
    };
  }

  return {
    allowed: true,
  };
};

// =========================================================
// LIMIT NORMALIZATION
// =========================================================

const normalizeLimit = (limit = MAX_RESULTS) => {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed)) {
    return MAX_RESULTS;
  }

  return Math.min(
    Math.max(Math.floor(parsed), 1),
    MAX_RESULTS
  );
};

// =========================================================
// RESIDENT ID EXTRACTION
// =========================================================

const extractResidentId = (text) => {
  const match = text.match(
    /\bTHR-\d+\b/i
  );

  return match
    ? match[0].toUpperCase()
    : null;
};

// =========================================================
// HOUSEHOLD ID EXTRACTION
// =========================================================

const extractHouseholdId = (text) => {
  const match = text.match(
    /\bTHH-\d+\b/i
  );

  return match
    ? match[0].toUpperCase()
    : null;
};

// =========================================================
// GENDER DETECTION
// =========================================================

const detectGender = (text) => {
  if (
    /\b(female|women|woman|ladies|lady)\b/i.test(
      text
    )
  ) {
    return "female";
  }

  if (
    /\b(male|men|man|boys|boy)\b/i.test(
      text
    )
  ) {
    return "male";
  }

  if (
    /\b(other gender|other genders)\b/i.test(
      text
    )
  ) {
    return "other";
  }

  return null;
};

// =========================================================
// VERIFICATION STATUS DETECTION
// =========================================================

const detectVerificationStatus = (text) => {
  if (
    /\b(awaiting verification|awaiting approval|pending verification|pending verification status|pending)\b/i.test(text)
  ) {
    return "pending";
  }

  if (
    /\b(verified|approved|successfully verified)\b/i.test(text)
  ) {
    return "verified";
  }

  if (
    /\b(rejected|declined verification|verification rejected)\b/i.test(text)
  ) {
    return "rejected";
  }

  return null;
};

// =========================================================
// IDENTITY STATUS DETECTION
// =========================================================

const detectIdentityStatus = (text) => {
  const statuses = [
    "pending",
    "active",
    "suspended",
    "deceased",
    "moved",
  ];

  for (const status of statuses) {
    const expression = new RegExp(
      `\\b${status}\\s+(?:digital\\s+)?identity\\b|\\bidentity\\s+${status}\\b`,
      "i"
    );

    if (expression.test(text)) {
      return status;
    }
  }

  return null;
};

// =========================================================
// BIOMETRIC DETECTION
// =========================================================

const detectBiometricStatus = (text) => {
  if (
    !/\b(biometric|biometrics|fingerprint)\b/i.test(
      text
    )
  ) {
    return null;
  }

  if (
    /\b(not enrolled|unenrolled|without biometric|without biometrics|not captured|no biometric|no biometrics)\b/i.test(text)
  ) {
    return false;
  }

  if (
    /\b(enrolled|captured|registered)\b/i.test(text)
  ) {
    return true;
  }

  return "any";
};

// =========================================================
// GPS STATUS DETECTION
// =========================================================

const detectGPSStatus = (text) => {
  if (
    /\b(unmapped|not mapped|without gps|without location|no gps|no location)\b/i.test(text)
  ) {
    return false;
  }

  if (
    /\b(mapped|gps mapped|gps-enabled|with gps|with location)\b/i.test(text)
  ) {
    return true;
  }

  return null;
};

// =========================================================
// NAME EXTRACTION
// =========================================================

const extractNameSearch = (text) => {
  const patterns = [
    /\b(?:named|name is|called)\s+([a-z][a-z\s'-]{1,60})/i,

    /\b(?:resident|residents)\s+(?:named|called)\s+([a-z][a-z\s'-]{1,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      let name = match[1].trim();

      name = name
        .replace(
          /\b(?:please|who|that|with|having|and|or|in|from|whose|are|is|was|were)\b.*$/i,
          ""
        )
        .trim();

      if (name) {
        return name;
      }
    }
  }

  return null;
};

// =========================================================
// HOUSEHOLD SEARCH TERM EXTRACTION
// =========================================================

const extractHouseholdSearch = (text) => {
  const quotedMatch = text.match(
    /["']([^"']+)["']/
  );

  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  const compoundMatch = text.match(
    /\b(?:compound|house number|house)\s+([a-z0-9][a-z0-9\s-]{1,60})/i
  );

  if (compoundMatch?.[1]) {
    return compoundMatch[1]
      .replace(
        /\b(?:household|households|please|with|having|that|which)\b.*$/i,
        ""
      )
      .trim();
  }

  return null;
};

// =========================================================
// COUNT INTENT
// =========================================================

const isCountIntent = (text) => {
  return /\b(how\s+many|number\s+of|count\s+of|total\s+number|total\s+of|how\s+much)\b/i.test(text);
};

// =========================================================
// LIST INTENT
// =========================================================

const isListIntent = (text) => {
  return /\b(show|list|display|give\s+me|which|who\s+are|who\s+is|identify)\b/i.test(text);
};

// =========================================================
// HOUSEHOLD INTENT
// =========================================================

const isHouseholdIntent = (text) => {
  return /\b(household|households|house|houses|compound|compounds)\b/i.test(text);
};

// =========================================================
// RESIDENT INTENT
// =========================================================

const isResidentIntent = (text) => {
  return /\b(resident|residents|person|people|persons|individual|individuals)\b/i.test(text);
};

// =========================================================
// RESIDENT FILTER COLLECTION
// =========================================================
//
// This is important in Phase 1.6.3.
//
// It allows the router to recognize that:
//
// "female residents awaiting verification"
//
// contains TWO filters:
//
// gender = female
// verificationStatus = pending
//
// The router must NOT silently apply only one filter.
//
// =========================================================

const collectResidentFilters = (text) => {
  const gender = detectGender(text);

  const verificationStatus =
    detectVerificationStatus(text);

  const identityStatus =
    detectIdentityStatus(text);

  const biometricStatus =
    detectBiometricStatus(text);

  const filters = {};

  if (gender) {
    filters.gender = gender;
  }

  if (verificationStatus) {
    filters.verificationStatus =
      verificationStatus;
  }

  if (identityStatus) {
    filters.identityStatus =
      identityStatus;
  }

  if (
    typeof biometricStatus === "boolean"
  ) {
    filters.biometricEnrolled =
      biometricStatus;
  }

  return {
    filters,
    gender,
    verificationStatus,
    identityStatus,
    biometricStatus,
    filterCount:
      Object.keys(filters).length,
  };
};

// =========================================================
// CHECK COMPOUND RESIDENT FILTER
// =========================================================

const isCompoundResidentFilter = ({
  filterCount,
}) => {
  return filterCount > 1;
};

// =========================================================
// BUILD RESIDENT COUNT ARGUMENTS
// =========================================================

const buildResidentCountArguments = ({
  gender,
  verificationStatus,
  identityStatus,
  biometricStatus,
}) => {
  return {
    ...(gender
      ? { gender }
      : {}),

    ...(verificationStatus
      ? {
          verificationStatus,
        }
      : {}),

    ...(identityStatus
      ? {
          identityStatus,
        }
      : {}),

    ...(typeof biometricStatus === "boolean"
      ? {
          biometricEnrolled:
            biometricStatus,
        }
      : {}),
  };
};

// =========================================================
// ROUTE RESIDENT QUERY
// =========================================================

const routeResidentQuery = async ({
  text,
}) => {
  // -------------------------------------------------------
  // FIND RESIDENT BY ID
  // -------------------------------------------------------

  const residentId =
    extractResidentId(text);

  if (residentId) {
    return {
      matched: true,
      category: "resident",
      operation: "findResidentById",
      arguments: {
        residentId,
      },
      result:
        await residentTools.findResidentById(
          residentId
        ),
    };
  }

  // -------------------------------------------------------
  // COLLECT FILTERS
  // -------------------------------------------------------

  const residentFilters =
    collectResidentFilters(text);

  const {
    gender,
    verificationStatus,
    identityStatus,
    biometricStatus,
    filterCount,
  } = residentFilters;

  const countArguments =
    buildResidentCountArguments({
      gender,
      verificationStatus,
      identityStatus,
      biometricStatus,
    });

  // -------------------------------------------------------
  // COMPOUND FILTER COUNT
  // -------------------------------------------------------
  //
  // SAFE:
  //
  // "How many female residents are awaiting
  // verification?"
  //
  // The underlying count tool supports multiple filters.
  //
  // -------------------------------------------------------

  if (
    isCountIntent(text) &&
    filterCount > 0
  ) {
    return {
      matched: true,
      category: "resident",
      operation: "getResidentCount",
      arguments: countArguments,
      result:
        await residentTools.getResidentCount(
          countArguments
        ),
    };
  }

  // -------------------------------------------------------
  // COMPOUND FILTER LIST
  // -------------------------------------------------------
  //
  // IMPORTANT:
  // Current list tools do NOT support multiple
  // simultaneous filters.
  //
  // Therefore DO NOT silently return a partial result.
  // -------------------------------------------------------

  if (
    isListIntent(text) &&
    isCompoundResidentFilter(
      residentFilters
    )
  ) {
    return {
      matched: true,
      category: "resident",
      operation:
        "unsupported_compound_list",
      arguments: countArguments,
      result: {
        supported: false,
        reason:
          "The current Phase 1.6 retrieval layer can count residents using multiple filters, but it cannot yet safely return a list using multiple resident filters simultaneously.",
        detectedFilters:
          countArguments,
        message:
          "I can provide the count for this combination, but I cannot safely list the matching residents yet without a dedicated compound-filter retrieval tool.",
      },
    };
  }

  // -------------------------------------------------------
  // COUNT ALL RESIDENTS
  // -------------------------------------------------------

  if (
    isCountIntent(text) &&
    isResidentIntent(text)
  ) {
    return {
      matched: true,
      category: "resident",
      operation: "getResidentCount",
      arguments: {},
      result:
        await residentTools.getResidentCount(
          {}
        ),
    };
  }

  // -------------------------------------------------------
  // LIST BY VERIFICATION STATUS
  // -------------------------------------------------------

  if (
    verificationStatus &&
    (
      isListIntent(text) ||
      /\b(residents|people|persons)\b/i.test(
        text
      )
    )
  ) {
    return {
      matched: true,
      category: "resident",
      operation:
        "getResidentsByVerificationStatus",
      arguments: {
        verificationStatus,
        limit: MAX_RESULTS,
      },
      result:
        await residentTools.getResidentsByVerificationStatus(
          {
            verificationStatus,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // LIST BY GENDER
  // -------------------------------------------------------

  if (
    gender &&
    (
      isListIntent(text) ||
      /\b(residents|people|persons)\b/i.test(
        text
      )
    )
  ) {
    return {
      matched: true,
      category: "resident",
      operation: "getResidentsByGender",
      arguments: {
        gender,
        limit: MAX_RESULTS,
      },
      result:
        await residentTools.getResidentsByGender(
          {
            gender,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // BIOMETRIC COUNT
  // -------------------------------------------------------

  if (
    typeof biometricStatus === "boolean" &&
    isCountIntent(text)
  ) {
    return {
      matched: true,
      category: "resident",
      operation: "getResidentCount",
      arguments: {
        biometricEnrolled:
          biometricStatus,
      },
      result:
        await residentTools.getResidentCount(
          {
            biometricEnrolled:
              biometricStatus,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // IDENTITY COUNT
  // -------------------------------------------------------

  if (
    identityStatus &&
    isCountIntent(text)
  ) {
    return {
      matched: true,
      category: "resident",
      operation: "getResidentCount",
      arguments: {
        identityStatus,
      },
      result:
        await residentTools.getResidentCount(
          {
            identityStatus,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // NAME SEARCH
  // -------------------------------------------------------

  const name =
    extractNameSearch(text);

  if (name) {
    return {
      matched: true,
      category: "resident",
      operation: "findResidentsByName",
      arguments: {
        name,
        limit: MAX_RESULTS,
      },
      result:
        await residentTools.findResidentsByName(
          {
            name,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  return {
    matched: false,
  };
};

// =========================================================
// ROUTE HOUSEHOLD QUERY
// =========================================================

const routeHouseholdQuery = async ({
  text,
}) => {
  // -------------------------------------------------------
  // FIND HOUSEHOLD BY ID
  // -------------------------------------------------------

  const householdId =
    extractHouseholdId(text);

  if (householdId) {
    return {
      matched: true,
      category: "household",
      operation: "findHouseholdById",
      arguments: {
        householdId,
      },
      result:
        await householdTools.findHouseholdById(
          householdId
        ),
    };
  }

  // -------------------------------------------------------
  // HOUSEHOLDS WITHOUT HEAD
  // -------------------------------------------------------

  if (
    /\b(no\s+household\s+head|without\s+(?:a\s+)?household\s+head|missing\s+household\s+head|households?\s+without\s+heads?)\b/i.test(text)
  ) {
    return {
      matched: true,
      category: "household",
      operation:
        "getHouseholdsWithoutHead",
      arguments: {
        limit: MAX_RESULTS,
      },
      result:
        await householdTools.getHouseholdsWithoutHead(
          {
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // GPS STATUS
  // -------------------------------------------------------

  const gpsStatus =
    detectGPSStatus(text);

  // -------------------------------------------------------
  // HOUSEHOLD COUNT
  // -------------------------------------------------------

  if (
    isCountIntent(text) &&
    isHouseholdIntent(text)
  ) {
    // -----------------------------------------------------
    // IMPORTANT:
    //
    // getHouseholdsByGPSStatus() returns a LIMITED LIST.
    // Its "count" is therefore NOT a database-wide total.
    //
    // Do not report it as a true total.
    // -----------------------------------------------------

    if (gpsStatus !== null) {
      return {
        matched: true,
        category: "household",
        operation:
          "unsupported_household_count",
        arguments: {
          mapped: gpsStatus,
        },
        result: {
          supported: false,
          message:
            "The current household retrieval layer does not contain a dedicated database-wide household count tool for this filter.",
          suggestedOperation:
            gpsStatus
              ? "getHouseholdsByGPSStatus"
              : "getUnmappedHouseholds",
          note:
            "The available household retrieval functions are limited to 20 records and should not be presented as a complete database count.",
        },
      };
    }

    // -----------------------------------------------------
    // WITHOUT HEAD COUNT
    // -----------------------------------------------------

    if (
      /\b(without\s+(?:a\s+)?head|no\s+head|missing\s+head)\b/i.test(text)
    ) {
      return {
        matched: true,
        category: "household",
        operation:
          "unsupported_household_count",
        arguments: {},
        result: {
          supported: false,
          message:
            "The current household retrieval layer can list households without a household head, but it does not yet provide a database-wide count for them.",
        },
      };
    }

    // -----------------------------------------------------
    // GENERIC HOUSEHOLD COUNT
    // -----------------------------------------------------

    return {
      matched: true,
      category: "household",
      operation:
        "unsupported_household_count",
      arguments: {},
      result: {
        supported: false,
        message:
          "The current household retrieval layer does not yet contain a dedicated total-household count tool.",
      },
    };
  }

  // -------------------------------------------------------
  // UNMAPPED HOUSEHOLDS
  // -------------------------------------------------------

  if (
    gpsStatus === false &&
    isHouseholdIntent(text)
  ) {
    return {
      matched: true,
      category: "household",
      operation:
        "getHouseholdsByGPSStatus",
      arguments: {
        mapped: false,
        limit: MAX_RESULTS,
      },
      result:
        await householdTools.getHouseholdsByGPSStatus(
          {
            mapped: false,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // MAPPED HOUSEHOLDS
  // -------------------------------------------------------

  if (
    gpsStatus === true &&
    isHouseholdIntent(text)
  ) {
    return {
      matched: true,
      category: "household",
      operation:
        "getHouseholdsByGPSStatus",
      arguments: {
        mapped: true,
        limit: MAX_RESULTS,
      },
      result:
        await householdTools.getHouseholdsByGPSStatus(
          {
            mapped: true,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  // -------------------------------------------------------
  // HOUSEHOLD SEARCH
  // -------------------------------------------------------

  const search =
    extractHouseholdSearch(text);

  if (
    search &&
    isHouseholdIntent(text)
  ) {
    return {
      matched: true,
      category: "household",
      operation: "findHouseholds",
      arguments: {
        search,
        limit: MAX_RESULTS,
      },
      result:
        await householdTools.findHouseholds(
          {
            search,
            limit: MAX_RESULTS,
          }
        ),
    };
  }

  return {
    matched: false,
  };
};

// =========================================================
// GENERAL QUERY ROUTER
// =========================================================

const routeTAHOSSQuery = async ({
  message,
  user = null,
} = {}) => {
  // -------------------------------------------------------
  // VALIDATION
  // -------------------------------------------------------

  if (
    !message ||
    typeof message !== "string"
  ) {
    return {
      routed: false,
      authorized: false,
      message:
        "A valid AI query is required.",
    };
  }

  const cleanMessage =
    message.trim();

  if (!cleanMessage) {
    return {
      routed: false,
      authorized: false,
      message:
        "A valid AI query is required.",
    };
  }

  // -------------------------------------------------------
  // AUTHORIZATION
  // -------------------------------------------------------

  const authorization =
    checkAuthorization(user);

  if (!authorization.allowed) {
    return {
      routed: false,
      authorized: false,
      message:
        authorization.message,
    };
  }

  // -------------------------------------------------------
  // NORMALIZE
  // -------------------------------------------------------

  const normalized =
    normalizeText(cleanMessage);

  // -------------------------------------------------------
  // RESIDENT ROUTING
  // -------------------------------------------------------

  const residentResult =
    await routeResidentQuery({
      text: normalized,
    });

  if (residentResult.matched) {
    return {
      routed: true,
      authorized: true,
      source: "residentTools",
      query: cleanMessage,
      ...residentResult,
    };
  }

  // -------------------------------------------------------
  // HOUSEHOLD ROUTING
  // -------------------------------------------------------

  const householdResult =
    await routeHouseholdQuery({
      text: normalized,
    });

  if (householdResult.matched) {
    return {
      routed: true,
      authorized: true,
      source: "householdTools",
      query: cleanMessage,
      ...householdResult,
    };
  }

  // -------------------------------------------------------
  // NO DATABASE TOOL MATCH
  // -------------------------------------------------------

  return {
    routed: false,
    authorized: true,
    query: cleanMessage,

    message:
      "No Phase 1.6 retrieval tool currently matches this question.",

    availableOperations: [
      "find resident by resident ID",
      "search residents by name",
      "find residents by gender",
      "find residents by verification status",
      "count residents using supported filters",
      "find household by household ID",
      "search households",
      "find households without household head",
      "find unmapped households",
      "find GPS-mapped households",
    ],
  };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  routeTAHOSSQuery,

  normalizeText,

  normalizeLimit,

  extractResidentId,

  extractHouseholdId,

  detectGender,

  detectVerificationStatus,

  detectIdentityStatus,

  detectBiometricStatus,

  detectGPSStatus,

  extractNameSearch,

  extractHouseholdSearch,

  isCountIntent,

  isListIntent,

  isHouseholdIntent,

  isResidentIntent,

  collectResidentFilters,
};