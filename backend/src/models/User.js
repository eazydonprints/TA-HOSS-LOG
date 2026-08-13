const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /*
     * =======================================================
     * BASIC INFORMATION
     * =======================================================
     */

    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    /*
     * =======================================================
     * PASSWORD
     * =======================================================
     */

    password: {
      type: String,
      required: true,
    },

    /*
     * =======================================================
     * ROLE
     * =======================================================
     */

    role: {
      type: String,

      enum: [
        "super_admin",
        "registration_officer",
        "verification_officer",
        "viewer",
      ],

      default: "viewer",

      index: true,
    },

    /*
     * =======================================================
     * PROFILE PHOTO
     * =======================================================
     */

    photo: {
      type: String,
      default: null,
      trim: true,
    },

    photoPublicId: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * =======================================================
     * ACCOUNT STATUS
     * =======================================================
     */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /*
     * =======================================================
     * SOFT DELETE
     * =======================================================
     */

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
 * =========================================================
 * INDEXES
 * =========================================================
 */

userSchema.index({
  role: 1,
  isActive: 1,
});

userSchema.index({
  deletedAt: 1,
  isActive: 1,
});

module.exports =
  mongoose.model("User", userSchema);