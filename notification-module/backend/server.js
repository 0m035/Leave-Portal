const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite React dashboard
app.use(cors({
  origin: "*", // Enables simple testing from any development origin
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Bind REST Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    database: "CONNECTED",
    timestamp: new Date()
  });
});

// Centralized error handler middleware
app.use(errorHandler);

// Connect Database & Start Server
async function startServer() {
  try {
    // Sync models with database tables
    await sequelize.authenticate();
    console.log("SQL Database connection has been established successfully.");

    await sequelize.sync({ force: false }); // safe sync
    console.log("SQL Database schemas synchronized.");

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`Faculty Leave Notification Backend Running`);
      console.log(`Port    : ${PORT}`);
      console.log(`Health  : http://localhost:${PORT}/api/health`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error("Unable to connect to the database or start the server:", error);
    process.exit(1);
  }
}

startServer();
