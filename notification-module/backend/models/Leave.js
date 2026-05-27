const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Leave = sequelize.define("Leave", {
  leave_id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  faculty_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: User,
      key: "id"
    }
  },
  leave_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  from_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  to_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  hod_status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
    defaultValue: "PENDING"
  },
  clerk_status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
    defaultValue: "PENDING"
  },
  principal_status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
    defaultValue: "PENDING"
  },
  status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
    defaultValue: "PENDING"
  },
  applied_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approved_by: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: User,
      key: "id"
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "leaves",
  timestamps: false // already has applied_at
});

// Associations
Leave.belongsTo(User, { as: "Faculty", foreignKey: "faculty_id" });
Leave.belongsTo(User, { as: "Approver", foreignKey: "approved_by" });

module.exports = Leave;
