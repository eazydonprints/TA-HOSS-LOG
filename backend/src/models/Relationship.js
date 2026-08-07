const mongoose = require("mongoose");

const relationshipSchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    fromResident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      required: true,
      index: true,
    },

    toResident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      required: true,
      index: true,
    },

    relationship: {
      type: String,
      enum: [
        "spouse",
        "child",
        "parent",
        "sibling",
        "grandparent",
        "grandchild",
        "relative",
        "other",
      ],
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

relationshipSchema.index(
  {
    fromResident: 1,
    toResident: 1,
    relationship: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Relationship",
  relationshipSchema
);