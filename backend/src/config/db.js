const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("MongoDB URI not provided in .env");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.warn("MongoDB connection warning:", error.message);
    console.warn("ISL Prediction endpoints will continue functioning. Note that Auth endpoints require MongoDB.");
  }
};

module.exports = connectDB;
