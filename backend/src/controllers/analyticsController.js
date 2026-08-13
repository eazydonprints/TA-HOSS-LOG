const Resident = require("../models/Resident");
const Household = require("../models/Household");

const BASE_RESIDENT_MATCH = { deletedAt: null, status: "active" };
const BASE_HOUSEHOLD_MATCH = { deletedAt: null, status: "active" };

const safeNumber = (value) => Number(value || 0);

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
};

const getRange = (req) => {
  const requestedMonths = Math.min(
    Math.max(Number.parseInt(req.query.months, 10) || 12, 3),
    24
  );

  let from = parseDate(req.query.from);
  let to = parseDate(req.query.to, true) || new Date();

  if (!from && req.query.period && req.query.period !== "all") {
    const days = {
      "7d": 7,
      "30d": 30,
      "3m": 90,
      "6m": 180,
      "12m": 365,
    }[req.query.period];

    if (days) {
      from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));
    }
  }

  if (!from && !req.query.period) {
    from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setMonth(from.getMonth() - (requestedMonths - 1));
    from.setDate(1);
  }

  if (from && to < from) {
    const swap = from;
    from = to;
    to = swap;
  }

  return { from, to, months: requestedMonths };
};

const formatDateForResponse = (date) =>
  date ? date.toISOString().slice(0, 10) : null;

const getOverview = async (req, res) => {
  try {
    const { from, to, months } = getRange(req);
    const residentMatch = { ...BASE_RESIDENT_MATCH };
    const householdMatch = { ...BASE_HOUSEHOLD_MATCH };

    if (from || to) {
      residentMatch.createdAt = {};
      householdMatch.createdAt = {};
      if (from) {
        residentMatch.createdAt.$gte = from;
        householdMatch.createdAt.$gte = from;
      }
      if (to) {
        residentMatch.createdAt.$lte = to;
        householdMatch.createdAt.$lte = to;
      }
    }

    const trendStart = from || (() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (months - 1));
      return date;
    })();

    const trendEnd = to || new Date();

    const [
      totalResidents,
      verifiedResidents,
      pendingResidents,
      rejectedResidents,
      activeIdentities,
      totalHouseholds,
      mappedResidents,
      gender,
      maritalStatus,
      education,
      occupation,
      relationship,
      ageGroups,
      householdSizes,
      monthlyRegistrations,
      monthlyVerifications,
      identityStatus,
      genderByHousehold,
      ageByGender,
      verificationByGender,
      completeness,
      geographicHouseholds,
      geographicResidentCounts,
    ] = await Promise.all([
      Resident.countDocuments(residentMatch),
      Resident.countDocuments({ ...residentMatch, verificationStatus: "verified" }),
      Resident.countDocuments({ ...residentMatch, verificationStatus: "pending" }),
      Resident.countDocuments({ ...residentMatch, verificationStatus: "rejected" }),
      Resident.countDocuments({ ...residentMatch, identityStatus: "active" }),
      Household.countDocuments(householdMatch),
      Resident.countDocuments({
        ...residentMatch,
        "gps.latitude": { $exists: true, $ne: null },
        "gps.longitude": { $exists: true, $ne: null },
      }),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $ifNull: ["$gender", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $ifNull: ["$maritalStatus", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $cond: [{ $eq: [{ $ifNull: ["$educationLevel", ""] }, ""] }, "unknown", "$educationLevel"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $cond: [{ $eq: [{ $ifNull: ["$occupation", ""] }, ""] }, "unknown", "$occupation"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $ifNull: ["$relationshipToHead", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Resident.aggregate([
        { $match: { ...residentMatch, dateOfBirth: { $exists: true, $ne: null } } },
        { $set: { age: { $dateDiff: { startDate: "$dateOfBirth", endDate: "$$NOW", unit: "year" } } } },
        { $set: { ageGroup: { $switch: {
          branches: [
            { case: { $lte: ["$age", 4] }, then: "0–4" },
            { case: { $lte: ["$age", 14] }, then: "5–14" },
            { case: { $lte: ["$age", 24] }, then: "15–24" },
            { case: { $lte: ["$age", 34] }, then: "25–34" },
            { case: { $lte: ["$age", 44] }, then: "35–44" },
            { case: { $lte: ["$age", 54] }, then: "45–54" },
            { case: { $lte: ["$age", 64] }, then: "55–64" },
          ],
          default: "65+",
        } } } },
        { $group: { _id: "$ageGroup", count: { $sum: 1 } } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: "$household", size: { $sum: 1 } } },
        { $group: { _id: { $switch: {
          branches: [
            { case: { $eq: ["$size", 1] }, then: "1" },
            { case: { $eq: ["$size", 2] }, then: "2" },
            { case: { $eq: ["$size", 3] }, then: "3" },
            { case: { $eq: ["$size", 4] }, then: "4" },
            { case: { $eq: ["$size", 5] }, then: "5" },
          ],
          default: "6+",
        } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Resident.aggregate([
        { $match: { ...residentMatch, createdAt: { $gte: trendStart, $lte: trendEnd } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      Resident.aggregate([
        { $match: { ...residentMatch, verificationStatus: "verified", createdAt: { $gte: trendStart, $lte: trendEnd } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { $ifNull: ["$identityStatus", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { household: "$household", gender: { $ifNull: ["$gender", "unknown"] } }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.gender", households: { $sum: 1 }, residents: { $sum: "$count" } } },
        { $sort: { residents: -1 } },
      ]),

      Resident.aggregate([
        { $match: { ...residentMatch, dateOfBirth: { $exists: true, $ne: null } } },
        { $set: { age: { $dateDiff: { startDate: "$dateOfBirth", endDate: "$$NOW", unit: "year" } } } },
        { $set: { ageGroup: { $switch: {
          branches: [
            { case: { $lte: ["$age", 14] }, then: "0–14" },
            { case: { $lte: ["$age", 24] }, then: "15–24" },
            { case: { $lte: ["$age", 34] }, then: "25–34" },
            { case: { $lte: ["$age", 44] }, then: "35–44" },
            { case: { $lte: ["$age", 54] }, then: "45–54" },
            { case: { $lte: ["$age", 64] }, then: "55–64" },
          ],
          default: "65+",
        } } } },
        { $group: { _id: { ageGroup: "$ageGroup", gender: { $ifNull: ["$gender", "unknown"] } }, count: { $sum: 1 } } },
        { $sort: { "_id.ageGroup": 1, count: -1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $group: { _id: { gender: { $ifNull: ["$gender", "unknown"] }, status: { $ifNull: ["$verificationStatus", "unknown"] } }, count: { $sum: 1 } } },
        { $sort: { "_id.gender": 1, count: -1 } },
      ]),

      Resident.aggregate([
        { $match: residentMatch },
        { $project: { gender: { $ifNull: ["$gender", ""] }, occupation: { $ifNull: ["$occupation", ""] }, educationLevel: { $ifNull: ["$educationLevel", ""] }, maritalStatus: { $ifNull: ["$maritalStatus", ""] }, dateOfBirth: 1, gps: 1 } },
        { $group: {
          _id: null,
          missingGender: { $sum: { $cond: [{ $eq: ["$gender", ""] }, 1, 0] } },
          missingOccupation: { $sum: { $cond: [{ $eq: ["$occupation", ""] }, 1, 0] } },
          missingEducation: { $sum: { $cond: [{ $eq: ["$educationLevel", ""] }, 1, 0] } },
          missingMaritalStatus: { $sum: { $cond: [{ $eq: ["$maritalStatus", ""] }, 1, 0] } },
          missingDateOfBirth: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$dateOfBirth", null] }, null] }, 1, 0] } },
          mappedResidents: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$gps.latitude", null] }, null] }, { $ne: [{ $ifNull: ["$gps.longitude", null] }, null] }] }, 1, 0] } },
        } },
      ]),

      // Geographic intelligence uses the current active community footprint.
      Household.find(householdMatch)
        .select("_id householdId community compound houseNumber location status")
        .lean(),

      Resident.aggregate([
        {
          $match: {
            ...BASE_RESIDENT_MATCH,
            "gps.latitude": { $exists: true, $ne: null },
            "gps.longitude": { $exists: true, $ne: null },
          },
        },
        { $group: {
          _id: "$household",
          residentCount: { $sum: 1 },
          verifiedCount: { $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] } },
        } },
      ]),
    ]);

    const ageOrder = ["0–4", "5–14", "15–24", "25–34", "35–44", "45–54", "55–64", "65+"];
    const ageMap = new Map(ageGroups.map((item) => [item._id, item.count]));

    const trendMap = new Map(
      monthlyRegistrations.map((item) => [
        `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        item.count,
      ])
    );
    const verificationMap = new Map(
      monthlyVerifications.map((item) => [
        `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        item.count,
      ])
    );

    const registrationTrend = [];
    const verificationTrend = [];
    const cursor = new Date(trendStart);
    cursor.setDate(1);
    const trendCursorEnd = new Date(trendEnd);
    trendCursorEnd.setDate(1);

    while (cursor <= trendCursorEnd && registrationTrend.length < 24) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      registrationTrend.push({
        key,
        label: cursor.toLocaleString("en-US", { month: "short" }),
        year: cursor.getFullYear(),
        count: trendMap.get(key) || 0,
      });
      verificationTrend.push({
        key,
        label: cursor.toLocaleString("en-US", { month: "short" }),
        year: cursor.getFullYear(),
        count: verificationMap.get(key) || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const gpsCoverage = totalResidents ? Number(((mappedResidents / totalResidents) * 100).toFixed(1)) : 0;
    const verificationRate = totalResidents ? Number(((verifiedResidents / totalResidents) * 100).toFixed(1)) : 0;
    const quality = completeness[0] || {};
    const completenessFields = [
      { key: "gender", label: "Gender", missing: safeNumber(quality.missingGender) },
      { key: "occupation", label: "Occupation", missing: safeNumber(quality.missingOccupation) },
      { key: "education", label: "Education", missing: safeNumber(quality.missingEducation) },
      { key: "maritalStatus", label: "Marital status", missing: safeNumber(quality.missingMaritalStatus) },
      { key: "dateOfBirth", label: "Date of birth", missing: safeNumber(quality.missingDateOfBirth) },
      { key: "gps", label: "GPS coordinates", missing: Math.max(totalResidents - safeNumber(quality.mappedResidents), 0) },
    ].map((item) => ({
      ...item,
      complete: Math.max(totalResidents - item.missing, 0),
      rate: totalResidents ? Number((((totalResidents - item.missing) / totalResidents) * 100).toFixed(1)) : 0,
    }));
    const overallCompleteness = completenessFields.length
      ? Number((completenessFields.reduce((sum, item) => sum + item.rate, 0) / completenessFields.length).toFixed(1))
      : 0;
    const householdAverage = totalHouseholds ? Number((totalResidents / totalHouseholds).toFixed(1)) : 0;
    const topOccupation = occupation[0]?._id || null;
    const topGender = gender[0]?._id || null;
    const unknownGender = gender.find((item) => item._id === "unknown")?.count || 0;
    const unknownOccupation = occupation.find((item) => item._id === "unknown")?.count || 0;
    const dataCompleteness = totalResidents
      ? Number((((totalResidents - unknownGender - unknownOccupation) / (totalResidents * 2)) * 100).toFixed(1))
      : 0;

    // =========================================================
    // GEOGRAPHIC INTELLIGENCE
    // =========================================================
    const residentCountMap = new Map(
      geographicResidentCounts.map((item) => [String(item._id), item])
    );

    const mappedHouseholdPoints = geographicHouseholds
      .filter((household) => {
        const location = household.location || {};
        return Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));
      })
      .map((household) => {
        const location = household.location || {};
        const counts = residentCountMap.get(String(household._id)) || {};
        return {
          id: String(household._id),
          householdId: household.householdId,
          community: household.community || "Ta-hoss Community",
          compound: household.compound || "Not recorded",
          houseNumber: household.houseNumber || "Not recorded",
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          accuracy: location.accuracy !== undefined && location.accuracy !== null ? Number(location.accuracy) : null,
          capturedAt: location.capturedAt || null,
          residentCount: Number(counts.residentCount || 0),
          verifiedCount: Number(counts.verifiedCount || 0),
        };
      });

    const mappedHouseholdCount = mappedHouseholdPoints.length;
    const activeHouseholdCount = geographicHouseholds.length;
    const unmappedHouseholdCount = Math.max(activeHouseholdCount - mappedHouseholdCount, 0);
    const householdGpsCoverage = activeHouseholdCount
      ? Number(((mappedHouseholdCount / activeHouseholdCount) * 100).toFixed(1))
      : 0;

    const validAccuracy = mappedHouseholdPoints
      .map((point) => point.accuracy)
      .filter((value) => Number.isFinite(value) && value >= 0);
    const averageGpsAccuracy = validAccuracy.length
      ? Number((validAccuracy.reduce((sum, value) => sum + value, 0) / validAccuracy.length).toFixed(1))
      : null;

    const accuracyBands = [
      { key: "excellent", label: "Excellent (≤5m)", count: 0 },
      { key: "good", label: "Good (6–15m)", count: 0 },
      { key: "fair", label: "Fair (16–50m)", count: 0 },
      { key: "weak", label: "Weak (>50m)", count: 0 },
      { key: "unknown", label: "Accuracy not recorded", count: 0 },
    ];
    mappedHouseholdPoints.forEach((point) => {
      const accuracy = point.accuracy;
      if (!Number.isFinite(accuracy)) accuracyBands[4].count += 1;
      else if (accuracy <= 5) accuracyBands[0].count += 1;
      else if (accuracy <= 15) accuracyBands[1].count += 1;
      else if (accuracy <= 50) accuracyBands[2].count += 1;
      else accuracyBands[3].count += 1;
    });

    const geographicCenter = mappedHouseholdCount
      ? {
          latitude: Number((mappedHouseholdPoints.reduce((sum, point) => sum + point.latitude, 0) / mappedHouseholdCount).toFixed(6)),
          longitude: Number((mappedHouseholdPoints.reduce((sum, point) => sum + point.longitude, 0) / mappedHouseholdCount).toFixed(6)),
        }
      : null;

    const geographicBounds = mappedHouseholdCount
      ? {
          minLatitude: Math.min(...mappedHouseholdPoints.map((point) => point.latitude)),
          maxLatitude: Math.max(...mappedHouseholdPoints.map((point) => point.latitude)),
          minLongitude: Math.min(...mappedHouseholdPoints.map((point) => point.longitude)),
          maxLongitude: Math.max(...mappedHouseholdPoints.map((point) => point.longitude)),
        }
      : null;

    // Approximate concentration cells. These are analytical grid cells, not administrative boundaries.
    const concentrationMap = new Map();
    mappedHouseholdPoints.forEach((point) => {
      const latCell = Math.floor(point.latitude * 1000) / 1000;
      const lngCell = Math.floor(point.longitude * 1000) / 1000;
      const key = `${latCell.toFixed(3)},${lngCell.toFixed(3)}`;
      const existing = concentrationMap.get(key) || {
        key,
        latitude: Number((latCell + 0.0005).toFixed(6)),
        longitude: Number((lngCell + 0.0005).toFixed(6)),
        households: 0,
        residents: 0,
        unverifiedResidents: 0,
        weakGpsHouseholds: 0,
        priorityScore: 0,
      };
      const unverified = Math.max(point.residentCount - point.verifiedCount, 0);
      const accuracy = point.accuracy;
      const gpsRisk = !Number.isFinite(accuracy) ? 12 : accuracy > 50 ? 25 : accuracy > 15 ? 15 : accuracy > 5 ? 8 : 0;
      const verificationRisk = point.residentCount ? (unverified / point.residentCount) * 35 : 0;
      const householdSizeRisk = Math.min(point.residentCount / 10, 1) * 25;
      const priorityScore = Math.round(gpsRisk + verificationRisk + householdSizeRisk);
      existing.households += 1;
      existing.residents += point.residentCount;
      existing.unverifiedResidents += unverified;
      existing.weakGpsHouseholds += Number(!Number.isFinite(accuracy) || accuracy > 15);
      existing.priorityScore += priorityScore;
      concentrationMap.set(key, existing);
    });

    const concentrationZones = Array.from(concentrationMap.values())
      .sort((a, b) => b.households - a.households || b.residents - a.residents)
      .slice(0, 8)
      .map((zone, index) => ({ ...zone, rank: index + 1 }));

    // =========================================================
    // SPATIAL OPERATIONS INTELLIGENCE
    // =========================================================
    // Priority is an operational planning score, not a risk diagnosis.
    // It combines household size, verification gap and GPS quality so field
    // teams can work the most operationally demanding locations first.
    const priorityHouseholds = mappedHouseholdPoints
      .map((point) => {
        const unverifiedResidents = Math.max(point.residentCount - point.verifiedCount, 0);
        const verificationRisk = point.residentCount
          ? (unverifiedResidents / point.residentCount) * 35
          : 0;
        const householdSizeRisk = Math.min(point.residentCount / 10, 1) * 25;
        const accuracy = point.accuracy;
        const gpsRisk = !Number.isFinite(accuracy)
          ? 12
          : accuracy > 50
            ? 25
            : accuracy > 15
              ? 15
              : accuracy > 5
                ? 8
                : 0;
        const score = Math.min(100, Math.round(verificationRisk + householdSizeRisk + gpsRisk));
        const priority = score >= 55 ? "high" : score >= 30 ? "medium" : "low";
        return {
          ...point,
          unverifiedResidents,
          priorityScore: score,
          priority,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || b.unverifiedResidents - a.unverifiedResidents || b.residentCount - a.residentCount)
      .slice(0, 20);

    const priorityCounts = priorityHouseholds.reduce((acc, item) => {
      acc[item.priority] += 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    const mappedVerificationGap = mappedHouseholdPoints.reduce(
      (sum, point) => sum + Math.max(point.residentCount - point.verifiedCount, 0),
      0
    );

    const spatialOperations = {
      queue: priorityHouseholds.slice(0, 12),
      priorityCounts,
      mappedVerificationGap,
      unmappedHouseholds: unmappedHouseholdCount,
      fieldCoverage: householdGpsCoverage,
      recommendedTarget: unmappedHouseholdCount + mappedVerificationGap,
      zones: concentrationZones.map((zone) => ({
        ...zone,
        averagePriorityScore: zone.households
          ? Math.round(zone.priorityScore / zone.households)
          : 0,
        priority: zone.priorityScore / Math.max(zone.households, 1) >= 55
          ? "high"
          : zone.priorityScore / Math.max(zone.households, 1) >= 30
            ? "medium"
            : "low",
      })),
      generatedAt: new Date().toISOString(),
    };

    const mappedResidentsCurrent = geographicResidentCounts.reduce((sum, item) => sum + Number(item.residentCount || 0), 0);
    const residentGpsCoverageCurrent = totalResidents
      ? Number(((mappedResidentsCurrent / totalResidents) * 100).toFixed(1))
      : 0;

    const geographic = {
      activeHouseholds: activeHouseholdCount,
      mappedHouseholds: mappedHouseholdCount,
      unmappedHouseholds: unmappedHouseholdCount,
      householdGpsCoverage,
      mappedResidents: mappedResidentsCurrent,
      residentGpsCoverage: residentGpsCoverageCurrent,
      averageGpsAccuracy,
      accuracyBands,
      center: geographicCenter,
      bounds: geographicBounds,
      concentrationZones,
      // Keep payload bounded for larger communities while preserving the most useful points.
      points: mappedHouseholdPoints
        .sort((a, b) => b.residentCount - a.residentCount)
        .slice(0, 2000),
      generatedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: {
        community: "Ta-hoss Community",
        location: "Riyom Local Government Area, Plateau State, Nigeria",
        range: { from: formatDateForResponse(from), to: formatDateForResponse(to), months },
        overview: {
          totalResidents: safeNumber(totalResidents),
          totalHouseholds: safeNumber(totalHouseholds),
          verifiedResidents: safeNumber(verifiedResidents),
          pendingResidents: safeNumber(pendingResidents),
          rejectedResidents: safeNumber(rejectedResidents),
          activeIdentities: safeNumber(activeIdentities),
          mappedResidents: safeNumber(mappedResidents),
          gpsCoverage,
          verificationRate,
          householdAverage,
          dataCompleteness: overallCompleteness || dataCompleteness,
        },
        highlights: {
          topOccupation,
          topGender,
          largestAgeGroup: ageOrder.reduce((best, label) =>
            (ageMap.get(label) || 0) > (ageMap.get(best) || 0) ? label : best,
            ageOrder[0]
          ),
          totalPending: pendingResidents,
        },
        demographics: {
          gender: gender.map((item) => ({ label: item._id, count: item.count })),
          age: ageOrder.map((label) => ({ label, count: ageMap.get(label) || 0 })),
          maritalStatus: maritalStatus.map((item) => ({ label: item._id, count: item.count })),
          education: education.map((item) => ({ label: item._id, count: item.count })),
          occupation: occupation.map((item) => ({ label: item._id, count: item.count })),
          relationship: relationship.map((item) => ({ label: item._id, count: item.count })),
        },
        householdSizes: householdSizes.map((item) => ({ label: item._id, count: item.count })),
        identityStatus: identityStatus.map((item) => ({ label: item._id, count: item.count })),
        genderByHousehold: genderByHousehold.map((item) => ({ label: item._id, households: item.households, residents: item.residents })),
        ageByGender: ageByGender.map((item) => ({ ageGroup: item._id.ageGroup, gender: item._id.gender, count: item.count })),
        verificationByGender: verificationByGender.map((item) => ({ gender: item._id.gender, status: item._id.status, count: item.count })),
        dataQuality: { fields: completenessFields, overall: overallCompleteness },
        geographic,
        spatialOperations,
        registrationTrend,
        verificationTrend,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("ANALYTICS OVERVIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to generate community analytics." });
  }
};

module.exports = { getOverview };