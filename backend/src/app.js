const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const householdRoutes = require("./routes/householdRoutes");
const residentRoutes = require("./routes/residentRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const relationshipRoutes = require("./routes/relationshipRoutes");
const identityRoutes = require("./routes/identityRoutes");
const mapRoutes = require("./routes/mapRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const exportRoutes = require("./routes/exportRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const fieldOperationsRoutes = require("./routes/fieldOperationsRoutes");
const fieldEvidenceRoutes = require("./routes/fieldEvidenceRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TA-HOSS LOG API is running'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/households", householdRoutes);
app.use("/api/v1/residents", residentRoutes);
app.use("/api/v1/verification", verificationRoutes);
app.use("/api/v1/relationships", relationshipRoutes);
app.use("/api/v1/identity", identityRoutes);
app.use("/api/v1/map", mapRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/exports", exportRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/field-operations", fieldOperationsRoutes);
app.use("/api/v1/field-evidence", fieldEvidenceRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use(errorHandler);

module.exports = app;