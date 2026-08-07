const Household = require("../models/Household");

const generateHouseholdId = async () => {
  const lastHousehold = await Household.findOne({})
    .sort({ createdAt: -1 })
    .select("householdId");

  let nextNumber = 1;

  if (lastHousehold && lastHousehold.householdId) {
    const number = parseInt(
      lastHousehold.householdId.replace("THH-", ""),
      10
    );

    if (!isNaN(number)) {
      nextNumber = number + 1;
    }
  }

  return `THH-${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateHouseholdId;