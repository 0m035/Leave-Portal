const Notification = require("../models/Notification");

exports.getNotificationLogs = async (req, res, next) => {
  try {
    const logs = await Notification.findAll({
      order: [["created_at", "DESC"]],
      limit: 100
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
