const Resident = require("../models/Resident");
const Household = require("../models/Household");
const User = require("../models/User");

const buildCommunityContext = async () => {
  const activeResidentFilter = {
    status: "active",
    deletedAt: null,
  };

  const activeHouseholdFilter = {
    status: "active",
    deletedAt: null,
  };

  const [
    totalResidents,
    totalHouseholds,
    verifiedResidents,
    pendingResidents,
    rejectedResidents,
    activeResidents,
    inactiveResidents,
    maleResidents,
    femaleResidents,
    otherGenderResidents,
    activeIdentities,
    pendingIdentities,
    suspendedIdentities,
    deceasedIdentities,
    movedIdentities,
    biometricResidents,
    gpsResidents,
    users,
  ] = await Promise.all([
    Resident.countDocuments(activeResidentFilter),

    Household.countDocuments(activeHouseholdFilter),

    Resident.countDocuments({
      ...activeResidentFilter,
      verificationStatus: "verified",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      verificationStatus: "pending",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      verificationStatus: "rejected",
    }),

    Resident.countDocuments(activeResidentFilter),

    Resident.countDocuments({
      deletedAt: null,
      status: "inactive",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      gender: "male",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      gender: "female",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      gender: "other",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      identityStatus: "active",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      identityStatus: "pending",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      identityStatus: "suspended",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      identityStatus: "deceased",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      identityStatus: "moved",
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      "biometric.enrolled": true,
    }),

    Resident.countDocuments({
      ...activeResidentFilter,
      "gps.latitude": { $ne: null },
      "gps.longitude": { $ne: null },
    }),

    User.countDocuments({
      isActive: true,
      deletedAt: null,
    }),
  ]);

  const genderTotal =
    maleResidents +
    femaleResidents +
    otherGenderResidents;

  const verificationTotal =
    verifiedResidents +
    pendingResidents +
    rejectedResidents;

  const verificationRate =
    verificationTotal > 0
      ? Number(
          ((verifiedResidents / verificationTotal) * 100).toFixed(1)
        )
      : 0;

  const gpsCoverage =
    activeResidents > 0
      ? Number(
          ((gpsResidents / activeResidents) * 100).toFixed(1)
        )
      : 0;

  const biometricCoverage =
    activeResidents > 0
      ? Number(
          ((biometricResidents / activeResidents) * 100).toFixed(1)
        )
      : 0;

  return {
    community: {
      name: "Ta-hoss Community",
      lga: "Riyom",
      state: "Plateau",
      country: "Nigeria",
    },

    residents: {
      total: totalResidents,
      active: activeResidents,
      inactive: inactiveResidents,

      gender: {
        male: maleResidents,
        female: femaleResidents,
        other: otherGenderResidents,
        total: genderTotal,
      },

      verification: {
        verified: verifiedResidents,
        pending: pendingResidents,
        rejected: rejectedResidents,
        total: verificationTotal,
        verificationRate,
      },

      identity: {
        active: activeIdentities,
        pending: pendingIdentities,
        suspended: suspendedIdentities,
        deceased: deceasedIdentities,
        moved: movedIdentities,
      },

      biometric: {
        enrolled: biometricResidents,
        coverage: biometricCoverage,
      },

      gps: {
        mappedResidents: gpsResidents,
        coverage: gpsCoverage,
      },
    },

    households: {
      total: totalHouseholds,
    },

    system: {
      activeUsers: users,
    },

    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  buildCommunityContext,
};