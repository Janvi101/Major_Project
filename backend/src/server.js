
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "ISL NMF Backend is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// ISL prediction routes
app.use("/api/predict", predictionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});