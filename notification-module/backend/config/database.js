const { Sequelize } = require("sequelize");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const dialect = process.env.DB_DIALECT || "sqlite";
let sequelize;

if (dialect === "sqlite") {
  const storagePath = process.env.DB_STORAGE || "./database/leave_system.sqlite";
  const absolutePath = path.resolve(storagePath);
  const dir = path.dirname(absolutePath);

  // Ensure directories are created
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: absolutePath,
    logging: false
  });
} else {
  // Production-grade PostgreSQL or MySQL swappable configs
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: dialect,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;
