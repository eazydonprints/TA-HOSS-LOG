const dotenv = require("dotenv");

// Load environment variables first
dotenv.config();

const mongoose = require("mongoose");

const app = require("./app");


/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
  process.env.MONGODB_URI;


/* =========================================================
   VALIDATE ENVIRONMENT
========================================================= */

if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is not defined."
  );

  process.exit(1);
}


/* =========================================================
   DATABASE CONNECTION
========================================================= */

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log(
      "MongoDB connected successfully"
    );


    /* =====================================================
       START SERVER
    ===================================================== */

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `TA-HOSS LOG API running on port ${PORT}`
      );

      console.log(
        `Environment: ${
          process.env.NODE_ENV || "development"
        }`
      );
    });

  } catch (error) {

    console.error(
      "MongoDB connection error:",
      error.message
    );

    process.exit(1);
  }
};


/* =========================================================
   START APPLICATION
========================================================= */

startServer();