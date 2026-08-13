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
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Prevent duplicate active relationship records
 * between the same two residents with the same
 * relationship type.
 */
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

/*
 * Helpful indexes for household relationship queries.
 */
relationshipSchema.index({
  household: 1,
  deletedAt: 1,
});

relationshipSchema.index({
  fromResident: 1,
  deletedAt: 1,
});

relationshipSchema.index({
  toResident: 1,
  deletedAt: 1,
});

module.exports = mongoose.model(
  "Relationship",
  relationshipSchema
);