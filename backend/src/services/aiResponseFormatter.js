// =========================================================
// TA-HOSS AI RESPONSE FORMATTER
// =========================================================

const formatAIResult = (result) => {
  if (!result) {
    return {
      type: "empty",
      success: false,
      message:
        "No information was returned from the requested operation.",
    };
  }

  // -------------------------------------------------------
  // NOT FOUND
  // -------------------------------------------------------

  if (result.found === false) {
    return {
      type: "not_found",
      success: true,
      message:
        result.message ||
        "No matching record was found.",
      data: result,
    };
  }

  // -------------------------------------------------------
  // COUNT RESULT
  // -------------------------------------------------------

  if (
    typeof result.count === "number" &&
    !Array.isArray(result.residents) &&
    !Array.isArray(result.households)
  ) {
    return {
      type: "count",
      success: true,
      count: result.count,
      filters: result.filters || null,
      data: result,
    };
  }

  // -------------------------------------------------------
  // RESIDENT LIST
  // -------------------------------------------------------

  if (Array.isArray(result.residents)) {
    return {
      type: "resident_list",
      success: true,
      count:
        typeof result.count === "number"
          ? result.count
          : result.residents.length,
      limitedTo: result.limitedTo || null,
      data: result.residents,
    };
  }

  // -------------------------------------------------------
  // HOUSEHOLD LIST
  // -------------------------------------------------------

  if (Array.isArray(result.households)) {
    return {
      type: "household_list",
      success: true,
      count:
        typeof result.count === "number"
          ? result.count
          : result.households.length,
      limitedTo: result.limitedTo || null,
      data: result.households,
    };
  }

  // -------------------------------------------------------
  // SINGLE RESIDENT
  // -------------------------------------------------------

  if (result.resident) {
    return {
      type: "resident",
      success: true,
      data: result.resident,
    };
  }

  // -------------------------------------------------------
  // SINGLE HOUSEHOLD
  // -------------------------------------------------------

  if (result.household) {
    return {
      type: "household",
      success: true,
      data: result.household,
    };
  }

  // -------------------------------------------------------
  // FALLBACK STRUCTURED RESULT
  // -------------------------------------------------------

  return {
    type: "structured",
    success: true,
    data: result,
  };
};

module.exports = {
  formatAIResult,
};