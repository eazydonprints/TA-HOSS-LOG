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
app.use(errorHandler);
app.use("/api/v1/households", householdRoutes);
app.use("/api/v1/residents", residentRoutes);
app.use("/api/v1/verification", verificationRoutes);
app.use("/api/v1/relationships", relationshipRoutes);

module.exports = app;