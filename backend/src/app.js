const express = require("express");

const cors = require("cors");

const helmet = require("helmet");

const morgan = require("morgan");

const rateLimit = require("express-rate-limit");


/* =========================================================
   ROUTES
========================================================= */

const authRoutes = require("./routes/authRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");

const userRoutes = require("./routes/userRoutes");

const householdRoutes = require("./routes/householdRoutes");

const residentRoutes = require("./routes/residentRoutes");

const verificationRoutes = require("./routes/verificationRoutes");

const relationshipRoutes = require("./routes/relationshipRoutes");

const identityRoutes = require("./routes/identityRoutes");

const mapRoutes = require("./routes/mapRoutes");

const uploadRoutes = require("./routes/uploadRoutes");

const exportRoutes = require("./routes/exportRoutes");

const analyticsRoutes = require("./routes/analyticsRoutes");

const fieldOperationsRoutes =
  require("./routes/fieldOperationsRoutes");

const fieldEvidenceRoutes =
  require("./routes/fieldEvidenceRoutes");

const aiRoutes =
  require("./routes/aiRoutes");

const systemSettingsRoutes =
  require("./routes/systemSettingsRoutes");


/* =========================================================
   BIOMETRIC / WEBAUTHN ROUTES
========================================================= */

const biometricRoutes =
  require("./routes/biometricRoutes");


/* =========================================================
   ERROR HANDLER
========================================================= */

const errorHandler =
  require("./middleware/errorMiddleware");


/* =========================================================
   INITIALIZE EXPRESS APP
========================================================= */

const app = express();


/* =========================================================
   TRUST PROXY

   IMPORTANT FOR RENDER / PRODUCTION DEPLOYMENT

   Render places the application behind a proxy.

   This helps Express correctly identify HTTPS requests
   and client IP information.
========================================================= */

app.set(
  "trust proxy",
  1
);


/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);


/* =========================================================
   CORS CONFIGURATION

   DEVELOPMENT:
   - http://localhost:5173

   PRODUCTION:
   - FRONTEND_URL from environment variables

   MULTIPLE PRODUCTION ORIGINS CAN ALSO BE PROVIDED
   SEPARATED BY COMMAS.

   Example:

   FRONTEND_URL=https://ta-hoss-log.vercel.app
========================================================= */

const allowedOrigins = [

  "http://localhost:5173",

  "http://127.0.0.1:5173",

  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

];


/* =========================================================
   CORS MIDDLEWARE
========================================================= */

app.use(
  cors({

    origin: (origin, callback) => {

      /*
       * Requests without an Origin header are allowed.
       *
       * Examples may include:
       * - Server-to-server requests
       * - Health checks
       * - API testing tools
       */

      if (!origin) {
        return callback(null, true);
      }


      /*
       * Allow approved frontend origins.
       */

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }


      /*
       * Reject unknown origins.
       */

      console.warn(
        `CORS blocked request from: ${origin}`
      );


      return callback(
        new Error(
          "This origin is not allowed by CORS."
        )
      );
    },


    credentials: true,


    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],


    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],


    exposedHeaders: [
      "Content-Length",
    ],


    maxAge: 86400,

  })
);


/* =========================================================
   REQUEST BODY PARSERS
========================================================= */

app.use(
  express.json({
    limit: "2mb",
  })
);


app.use(
  express.urlencoded({
    extended: true,

    limit: "2mb",
  })
);


/* =========================================================
   REQUEST LOGGING
========================================================= */

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);


/* =========================================================
   RATE LIMITING
========================================================= */

const limiter = rateLimit({

  windowMs:
    15 * 60 * 1000,


  max:
    1000,


  standardHeaders:
    true,


  legacyHeaders:
    false,


  message: {

    success: false,

    message:
      "Too many requests. Please try again later.",

  },

});


/*
 * Apply rate limiting to API routes.
 */

app.use(
  "/api",
  limiter
);


/* =========================================================
   ROOT / API STATUS
========================================================= */

app.get(
  "/",
  (req, res) => {

    res.status(200).json({

      success: true,

      message:
        "TA-HOSS LOG API is running",

      environment:
        process.env.NODE_ENV ||
        "development",

      timestamp:
        new Date().toISOString(),

    });

  }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/v1/health",
  (req, res) => {

    res.status(200).json({

      success: true,

      message:
        "TA-HOSS LOG API is healthy",

      environment:
        process.env.NODE_ENV ||
        "development",

      timestamp:
        new Date().toISOString(),

    });

  }
);


/* =========================================================
   API INFORMATION
========================================================= */

app.get(
  "/api/v1",
  (req, res) => {

    res.status(200).json({

      success: true,

      application:
        "TA-HOSS LOG",

      version:
        "1.0.0",

      message:
        "TA-HOSS LOG Community Management System API",

    });

  }
);


/* =========================================================
   API ROUTES
========================================================= */


/* =========================================================
   AUTHENTICATION
========================================================= */

app.use(
  "/api/v1/auth",
  authRoutes
);


/* =========================================================
   BIOMETRIC / WEBAUTHN AUTHENTICATION

   Supports:

   - Fingerprint
   - Face ID
   - Windows Hello
   - Android biometrics
   - iPhone/iPad biometrics
   - Platform authenticators
   - External security keys
   - Passkeys
========================================================= */

app.use(
  "/api/v1/biometrics",
  biometricRoutes
);


/*
 * Backward compatibility route.
 *
 * This allows existing frontend requests using:
 *
 * /api/v1/biometric
 *
 * to continue working.
 */

app.use(
  "/api/v1/biometric",
  biometricRoutes
);


/* =========================================================
   DASHBOARD
========================================================= */

app.use(
  "/api/v1/dashboard",
  dashboardRoutes
);


/* =========================================================
   USER MANAGEMENT
========================================================= */

app.use(
  "/api/v1/users",
  userRoutes
);


/* =========================================================
   HOUSEHOLDS
========================================================= */

app.use(
  "/api/v1/households",
  householdRoutes
);


/* =========================================================
   RESIDENTS
========================================================= */

app.use(
  "/api/v1/residents",
  residentRoutes
);


/* =========================================================
   VERIFICATION
========================================================= */

app.use(
  "/api/v1/verification",
  verificationRoutes
);


/* =========================================================
   RELATIONSHIPS
========================================================= */

app.use(
  "/api/v1/relationships",
  relationshipRoutes
);


/* =========================================================
   IDENTITY
========================================================= */

app.use(
  "/api/v1/identity",
  identityRoutes
);


/* =========================================================
   COMMUNITY MAP
========================================================= */

app.use(
  "/api/v1/map",
  mapRoutes
);


/* =========================================================
   UPLOADS
========================================================= */

app.use(
  "/api/v1/uploads",
  uploadRoutes
);


/* =========================================================
   EXPORTS
========================================================= */

app.use(
  "/api/v1/exports",
  exportRoutes
);


/* =========================================================
   ANALYTICS
========================================================= */

app.use(
  "/api/v1/analytics",
  analyticsRoutes
);


/* =========================================================
   FIELD OPERATIONS
========================================================= */

app.use(
  "/api/v1/field-operations",
  fieldOperationsRoutes
);


/* =========================================================
   FIELD EVIDENCE
========================================================= */

app.use(
  "/api/v1/field-evidence",
  fieldEvidenceRoutes
);


/* =========================================================
   AI ASSISTANT
========================================================= */

app.use(
  "/api/v1/ai",
  aiRoutes
);


/* =========================================================
   SYSTEM SETTINGS
========================================================= */

app.use(
  "/api/v1/system-settings",
  systemSettingsRoutes
);


/* =========================================================
   404 NOT FOUND HANDLER

   MUST COME AFTER ALL ROUTES
========================================================= */

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        `Route not found: ${req.method} ${req.originalUrl}`,

    });

  }
);


/* =========================================================
   GLOBAL ERROR HANDLER

   MUST REMAIN LAST
========================================================= */

app.use(
  errorHandler
);


/* =========================================================
   EXPORT APPLICATION
========================================================= */

module.exports = app;