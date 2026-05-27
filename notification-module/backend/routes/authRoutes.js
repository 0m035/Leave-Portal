const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validateBody = require("../middlewares/validationMiddleware");

router.post(
  "/register",
  validateBody(["id", "name", "email", "role", "department", "password"]),
  authController.register
);

router.post(
  "/login",
  validateBody(["email", "password"]),
  authController.login
);

module.exports = router;
