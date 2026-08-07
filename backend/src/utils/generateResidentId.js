const Resident = require("../models/Resident");

const generateResidentId = async () => {
  const lastResident = await Resident.findOne({})
    .sort({ createdAt: -1 })
    .select("residentId");

  let nextNumber = 1;

  if (lastResident && lastResident.residentId) {
    const number = parseInt(
      lastResident.residentId.replace("THR-", ""),
      10
    );

    if (!isNaN(number)) {
      nextNumber = number + 1;
    }
  }

  return `THR-${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateResidentId;