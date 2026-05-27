const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define("Notification", {
  notification_id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  receiver_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  subject: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
    defaultValue: "PENDING"
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_log: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "notifications",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = Notification;
