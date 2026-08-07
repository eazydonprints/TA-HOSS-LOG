const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const existing = await User.findOne({ username: "admin" });

      if (existing) {
        console.log("Admin already exists.");
        process.exit();
      }

      const password = await bcrypt.hash("Admin@123", 10);

      await User.create({
        fullname: "TA-HOSS LOG Super Admin",
        username: "admin",
        password,
        role: "super_admin",
      });

      console.log("✅ Super admin created successfully.");
      process.exit();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })
  .catch(console.error);