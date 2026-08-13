const mongoose = require("mongoose");

const FieldEvidence = require("../models/FieldEvidence");
const FieldOperation = require("../models/FieldOperation");

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const getActor = (req) =>
  req.user?._id ||
  req.user?.id ||
  null;

const validObjectId = (value) =>
  Boolean(
    value &&
      mongoose.Types.ObjectId.isValid(value)
  );

const allowedTypes = new Set([
  "gps",
  "photo",
  "note",
  "document",
]);

const toNumberOrNull = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const toDateOrNull = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const cleanString = (
  value,
  maxLength = null
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  let result = String(value).trim();

  if (
    maxLength &&
    result.length > maxLength
  ) {
    result = result.slice(0, maxLength);
  }

  return result;
};

const sanitizeMetadata = (metadata) => {
  if (
    metadata === undefined ||
    metadata === null
  ) {
    return {};
  }

  if (
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  return metadata;
};

const validateCoordinates = (
  latitude,
  longitude
) => {
  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      valid: false,
      message:
        "GPS evidence requires valid latitude and longitude.",
    };
  }

  if (
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      valid: false,
      message:
        "Latitude must be between -90 and 90.",
    };
  }

  if (
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      valid: false,
      message:
        "Longitude must be between -180 and 180.",
    };
  }

  return {
    valid: true,
  };
};

const getOperation = async (
  operationId
) => {
  if (!validObjectId(operationId)) {
    return null;
  }

  return FieldOperation.findById(
    operationId
  );
};

/* -------------------------------------------------------------------------- */
/* LIST EVIDENCE                                                              */
/* GET /:operationId                                                          */
/* -------------------------------------------------------------------------- */

exports.list = async (req, res) => {
  try {
    const { operationId } =
      req.params;

    if (!validObjectId(operationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid operation reference.",
      });
    }

    const operation =
      await getOperation(operationId);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message:
          "Field operation not found.",
      });
    }

    const evidence =
      await FieldEvidence.find({
        operation: operationId,
      })
        .populate(
          "capturedBy",
          "username fullName name role"
        )
        .sort({
          capturedAt: -1,
          createdAt: -1,
        })
        .lean();

    return res.json({
      success: true,

      data: evidence,

      count: evidence.length,
    });
  } catch (error) {
    console.error(
      "FIELD EVIDENCE LIST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load field evidence.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* CREATE EVIDENCE                                                            */
/* POST /:operationId                                                         */
/* -------------------------------------------------------------------------- */

exports.create = async (req, res) => {
  try {
    const { operationId } =
      req.params;

    if (!validObjectId(operationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid operation reference.",
      });
    }

    const operation =
      await getOperation(operationId);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message:
          "Field operation not found.",
      });
    }

    const {
      type,
      title,
      description,
      fileUrl,
      fileName,
      mimeType,
      fileSize,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      metadata,
    } = req.body || {};

    /* ---------------------------------------------------------------------- */
    /* TYPE VALIDATION                                                        */
    /* ---------------------------------------------------------------------- */

    if (!allowedTypes.has(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid evidence type. Allowed types are gps, photo, note and document.",
      });
    }

    /* ---------------------------------------------------------------------- */
    /* NORMALIZE NUMERIC VALUES                                               */
    /* ---------------------------------------------------------------------- */

    const normalizedLatitude =
      toNumberOrNull(latitude);

    const normalizedLongitude =
      toNumberOrNull(longitude);

    const normalizedAccuracy =
      toNumberOrNull(accuracy);

    const normalizedFileSize =
      toNumberOrNull(fileSize);

    /* ---------------------------------------------------------------------- */
    /* GPS VALIDATION                                                         */
    /* ---------------------------------------------------------------------- */

    if (type === "gps") {
      const coordinateValidation =
        validateCoordinates(
          normalizedLatitude,
          normalizedLongitude
        );

      if (
        !coordinateValidation.valid
      ) {
        return res.status(400).json({
          success: false,
          message:
            coordinateValidation.message,
        });
      }

      if (
        normalizedAccuracy !== null &&
        normalizedAccuracy < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "GPS accuracy cannot be negative.",
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* FILE VALIDATION                                                        */
    /* ---------------------------------------------------------------------- */

    if (
      (type === "photo" ||
        type === "document") &&
      !cleanString(fileUrl)
    ) {
      return res.status(400).json({
        success: false,
        message:
          `${type === "photo" ? "Photo" : "Document"} evidence requires a file URL.`,
      });
    }

    if (
      normalizedFileSize !== null &&
      normalizedFileSize < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "File size cannot be negative.",
      });
    }

    /* ---------------------------------------------------------------------- */
    /* CAPTURE DATE VALIDATION                                                */
    /* ---------------------------------------------------------------------- */

    let normalizedCapturedAt;

    if (capturedAt) {
      normalizedCapturedAt =
        toDateOrNull(capturedAt);

      if (!normalizedCapturedAt) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid capturedAt date.",
        });
      }
    } else {
      normalizedCapturedAt =
        new Date();
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE EVIDENCE                                                        */
    /* ---------------------------------------------------------------------- */

    const evidence =
      await FieldEvidence.create({
        operation: operationId,

        type,

        title: cleanString(
          title,
          250
        ),

        description: cleanString(
          description,
          5000
        ),

        fileUrl: cleanString(
          fileUrl
        ),

        fileName: cleanString(
          fileName,
          500
        ),

        mimeType: cleanString(
          mimeType,
          150
        ),

        fileSize:
          normalizedFileSize,

        location: {
          latitude:
            normalizedLatitude,

          longitude:
            normalizedLongitude,

          accuracy:
            normalizedAccuracy,
        },

        capturedAt:
          normalizedCapturedAt,

        metadata:
          sanitizeMetadata(
            metadata
          ),

        capturedBy:
          getActor(req),
      });

    await evidence.populate(
      "capturedBy",
      "username fullName name role"
    );

    /* ---------------------------------------------------------------------- */
    /* SYNCHRONIZE GPS EVIDENCE TO FIELD OPERATION                            */
    /* ---------------------------------------------------------------------- */

    if (
      type === "gps" &&
      normalizedLatitude !== null &&
      normalizedLongitude !== null
    ) {
      operation.evidence = {
        latitude:
          normalizedLatitude,

        longitude:
          normalizedLongitude,

        accuracy:
          normalizedAccuracy,

        capturedAt:
          normalizedCapturedAt,
      };

      operation.updatedBy =
        getActor(req);

      await operation.save();
    }

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                               */
    /* ---------------------------------------------------------------------- */

    return res.status(201).json({
      success: true,

      message:
        "Field evidence recorded successfully.",

      data: evidence,
    });
  } catch (error) {
    console.error(
      "FIELD EVIDENCE CREATE ERROR:",
      error
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid field evidence data.",
        errors: Object.values(
          error.errors || {}
        ).map(
          (item) => item.message
        ),
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to record field evidence.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE EVIDENCE                                                            */
/* DELETE /item/:evidenceId                                                   */
/* -------------------------------------------------------------------------- */

exports.remove = async (req, res) => {
  try {
    const { evidenceId } =
      req.params;

    if (!validObjectId(evidenceId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid evidence reference.",
      });
    }

    const evidence =
      await FieldEvidence.findById(
        evidenceId
      );

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message:
          "Evidence not found.",
      });
    }

    const operationId =
      evidence.operation;

    const evidenceType =
      evidence.type;

    await FieldEvidence.deleteOne({
      _id: evidenceId,
    });

    /* ---------------------------------------------------------------------- */
    /* If the deleted evidence was the GPS evidence synchronized to the      */
    /* operation, attempt to restore the latest remaining GPS evidence.       */
    /* ---------------------------------------------------------------------- */

    if (
      evidenceType === "gps" &&
      operationId
    ) {
      const latestGps =
        await FieldEvidence.findOne({
          operation:
            operationId,

          type: "gps",
        })
          .sort({
            capturedAt: -1,
            createdAt: -1,
          })
          .lean();

      const operation =
        await FieldOperation.findById(
          operationId
        );

      if (operation) {
        if (latestGps) {
          operation.evidence = {
            latitude:
              latestGps.location
                ?.latitude ?? null,

            longitude:
              latestGps.location
                ?.longitude ?? null,

            accuracy:
              latestGps.location
                ?.accuracy ?? null,

            capturedAt:
              latestGps.capturedAt ||
              null,
          };
        } else {
          operation.evidence = {
            latitude: null,
            longitude: null,
            accuracy: null,
            capturedAt: null,
          };
        }

        operation.updatedBy =
          getActor(req);

        await operation.save();
      }
    }

    return res.json({
      success: true,

      message:
        "Evidence removed successfully.",
    });
  } catch (error) {
    console.error(
      "FIELD EVIDENCE DELETE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to remove evidence.",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* EVIDENCE SUMMARY                                                           */
/* GET /:operationId/summary                                                  */
/* -------------------------------------------------------------------------- */

exports.summary = async (req, res) => {
  try {
    const { operationId } =
      req.params;

    if (!validObjectId(operationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid operation reference.",
      });
    }

    const operation =
      await getOperation(operationId);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message:
          "Field operation not found.",
      });
    }

    const [
      total,
      gps,
      photos,
      notes,
      documents,
      latest,
    ] = await Promise.all([
      FieldEvidence.countDocuments({
        operation:
          operationId,
      }),

      FieldEvidence.countDocuments({
        operation:
          operationId,
        type: "gps",
      }),

      FieldEvidence.countDocuments({
        operation:
          operationId,
        type: "photo",
      }),

      FieldEvidence.countDocuments({
        operation:
          operationId,
        type: "note",
      }),

      FieldEvidence.countDocuments({
        operation:
          operationId,
        type: "document",
      }),

      FieldEvidence.findOne({
        operation:
          operationId,
      })
        .populate(
          "capturedBy",
          "username fullName name role"
        )
        .sort({
          capturedAt: -1,
          createdAt: -1,
        })
        .lean(),
    ]);

    /* ---------------------------------------------------------------------- */
    /* ADDITIONAL ANALYTICS DATA                                              */
    /* ---------------------------------------------------------------------- */

    const byType = {
      gps,
      photo: photos,
      note: notes,
      document: documents,
    };

    return res.json({
      success: true,

      data: {
        total,

        gps,

        photos,

        notes,

        documents,

        byType,

        hasEvidence:
          total > 0,

        hasGpsEvidence:
          gps > 0,

        hasPhotoEvidence:
          photos > 0,

        hasDocumentEvidence:
          documents > 0,

        hasNotes:
          notes > 0,

        latest,
      },
    });
  } catch (error) {
    console.error(
      "FIELD EVIDENCE SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load evidence summary.",
    });
  }
};