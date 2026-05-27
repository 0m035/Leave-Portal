const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get(
  "/history",
  authMiddleware,
  notificationController.getNotificationLogs
);

module.exports = router;
