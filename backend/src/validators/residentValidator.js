const validateCreateResident = (req, res, next) => {
  const {
    household,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    relationshipToHead,
  } = req.body;

  if (
    !household ||
    !firstName ||
    !lastName ||
    !gender ||
    !dateOfBirth ||
    !relationshipToHead
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Household, first name, last name, gender, date of birth and relationship to household head are required.",
    });
  }

  const allowedGenders = [
    "male",
    "female",
    "other",
  ];

  if (!allowedGenders.includes(gender)) {
    return res.status(400).json({
      success: false,
      message: "Invalid gender.",
    });
  }

  const relationships = [
    "head",
    "spouse",
    "child",
    "parent",
    "sibling",
    "grandparent",
    "grandchild",
    "relative",
    "other",
  ];

  if (!relationships.includes(relationshipToHead)) {
    return res.status(400).json({
      success: false,
      message: "Invalid household relationship.",
    });
  }

  next();
};

module.exports = validateCreateResident;