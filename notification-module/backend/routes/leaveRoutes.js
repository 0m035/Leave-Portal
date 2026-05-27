const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const validateBody = require("../middlewares/validationMiddleware");

router.post(
  "/apply",
  authMiddleware,
  roleMiddleware(["FACULTY"]),
  validateBody(["leave_type", "from_date", "to_date", "reason"]),
  leaveController.applyLeave
);

router.post(
  "/:id/approve",
  authMiddleware,
  roleMiddleware(["HOD", "PRINCIPAL"]),
  leaveController.approveLeave
);

router.post(
  "/:id/reject",
  authMiddleware,
  roleMiddleware(["HOD", "PRINCIPAL"]),
  leaveController.rejectLeave
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(["FACULTY"]),
  leaveController.getMyLeaves
);

router.get(
  "/pending",
  authMiddleware,
  roleMiddleware(["HOD", "PRINCIPAL"]),
  leaveController.getPendingRequests
);

router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["CLERK", "PRINCIPAL", "ADMIN"]),
  leaveController.getAllRequests
);

module.exports = router;
