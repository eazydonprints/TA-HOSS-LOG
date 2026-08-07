const validateCreateHousehold = (req, res, next) => {
  const { compound, houseNumber } = req.body;

  if (!compound && !houseNumber) {
    return res.status(400).json({
      success: false,
      message: "Compound or house number is required.",
    });
  }

  next();
};

const validateGPS = (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return next();
  }

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({
      success: false,
      message: "GPS coordinates must be numbers.",
    });
  }

  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude.",
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      message: "Invalid longitude.",
    });
  }

  next();
};

module.exports = {
  validateCreateHousehold,
  validateGPS,
};