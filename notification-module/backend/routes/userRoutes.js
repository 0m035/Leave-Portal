const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  userController.getAllUsers
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  userController.updateUser
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  userController.deleteUser
);

module.exports = router;
