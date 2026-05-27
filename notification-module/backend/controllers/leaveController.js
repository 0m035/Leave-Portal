const Leave = require("../models/Leave");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { Op } = require("sequelize");
const crypto = require("crypto");

exports.applyLeave = async (req, res, next) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;
    const faculty_id = req.user.id;

    const leaveId = `leave-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`;

    const newLeave = await Leave.create({
      leave_id: leaveId,
      faculty_id,
      leave_type,
      from_date,
      to_date,
      reason,
      hod_status: "PENDING",
      clerk_status: "PENDING",
      principal_status: "PENDING",
      status: "PENDING"
    });

    // Fetch full request details alongside faculty information for the notification templates
    const faculty = await User.findByPk(faculty_id);

    // Dynamic Multi-Level Notification Routing
    // 1. Notify HOD of the SAME department
    const hod = await User.findOne({
      where: {
        role: "HOD",
        department: faculty.department
      }
    });

    // 2. Notify all Principals
    const principals = await User.findAll({ where: { role: "PRINCIPAL" } });

    // 3. Notify all Clerks
    const clerks = await User.findAll({ where: { role: "CLERK" } });

    // Consolidate email addresses
    const emailRecipients = [];
    if (hod) emailRecipients.push(hod.email);
    principals.forEach(p => emailRecipients.push(p.email));
    clerks.forEach(c => emailRecipients.push(c.email));

    // Dedup and dispatch emails in background to prevent API blocking
    const uniqueEmails = [...new Set(emailRecipients)];
    uniqueEmails.forEach(email => {
      emailService.sendNewLeaveNotification(
        email,
        faculty.name,
        faculty.department,
        faculty.designation || "",
        leave_type,
        from_date,
        to_date,
        reason,
        req.body.substitute_teacher || "Not Specified",
        newLeave.leave_id
      ).catch(err => console.error(`[EmailService] Error sending new-leave notification to ${email}:`, err));
    });

    res.status(201).json({
      message: "Leave request submitted successfully. Email notifications have been dispatched to HOD, Principal, and Clerk.",
      leave: newLeave
    });
  } catch (err) {
    next(err);
  }
};

exports.approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const approverRole = req.user.role;
    const approverName = req.user.name;

    const leave = await Leave.findByPk(id, {
      include: [
        { model: User, as: "Faculty" }
      ]
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    if (leave.status !== "PENDING") {
      return res.status(400).json({ error: `Cannot process. This request is already ${leave.status}.` });
    }

    // Appending remarks for multi-stage tracking
    const oldRemarks = leave.remarks ? `${leave.remarks} | ` : "";
    const newRemarks = `${oldRemarks}[${approverRole}]: ${remarks || "Approved"}`;

    const updateFields = { remarks: newRemarks };

    // Apply approval to specific role stage
    if (approverRole === "HOD") {
      updateFields.hod_status = "APPROVED";
    } else if (approverRole === "PRINCIPAL") {
      updateFields.principal_status = "APPROVED";
    } else if (approverRole === "CLERK" || approverRole === "ADMIN") {
      updateFields.clerk_status = "APPROVED";
    }

    await leave.update(updateFields);

    // Reload state to inspect all three approval statuses
    const updatedLeave = await Leave.findByPk(id, {
      include: [{ model: User, as: "Faculty" }]
    });

    // Check if ALL levels have approved the request
    if (
      updatedLeave.hod_status === "APPROVED" &&
      updatedLeave.clerk_status === "APPROVED" &&
      updatedLeave.principal_status === "APPROVED"
    ) {
      // Finalize leave status to APPROVED
      await updatedLeave.update({
        status: "APPROVED",
        approved_by: req.user.id
      });

      // Send FINAL approved notification email to Faculty with full 3-stage summary
      if (updatedLeave.Faculty) {
        const stage1 = { status: updatedLeave.hod_status.toLowerCase(),       actorName: "HOD",       remarks: updatedLeave.remarks, actedOn: "" };
        const stage2 = { status: updatedLeave.clerk_status.toLowerCase(),     actorName: "Admin/Clerk", remarks: updatedLeave.remarks, actedOn: "" };
        const stage3 = { status: updatedLeave.principal_status.toLowerCase(), actorName: "Principal",  remarks: updatedLeave.remarks, actedOn: "" };
        emailService.sendFinalDecisionNotification(
          updatedLeave.Faculty.email,
          updatedLeave.Faculty.name,
          "APPROVED",
          updatedLeave.leave_type,
          updatedLeave.from_date,
          updatedLeave.to_date,
          stage1,
          stage2,
          stage3,
          updatedLeave.certificate_no || ""
        ).catch(err => console.error("[EmailService] Error sending approved notification to faculty:", err));
      }
    }

    res.json({
      message: "Leave approval stage processed successfully.",
      leave: updatedLeave
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const approverRole = req.user.role;
    const approverName = req.user.name;

    const leave = await Leave.findByPk(id, {
      include: [
        { model: User, as: "Faculty" }
      ]
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    if (leave.status !== "PENDING") {
      return res.status(400).json({ error: `Cannot process. This request is already ${leave.status}.` });
    }

    // Appending remarks for multi-stage tracking
    const oldRemarks = leave.remarks ? `${leave.remarks} | ` : "";
    const newRemarks = `${oldRemarks}[${approverRole}]: ${remarks || "Rejected"}`;

    const updateFields = {
      remarks: newRemarks,
      status: "REJECTED", // A single rejection fails the multi-level process
      approved_by: req.user.id
    };

    if (approverRole === "HOD") {
      updateFields.hod_status = "REJECTED";
    } else if (approverRole === "PRINCIPAL") {
      updateFields.principal_status = "REJECTED";
    } else if (approverRole === "CLERK" || approverRole === "ADMIN") {
      updateFields.clerk_status = "REJECTED";
    }

    await leave.update(updateFields);

    // Send IMMEDIATE rejected notification to Faculty with full stage summary
    if (leave.Faculty) {
      const stage1 = { status: leave.hod_status.toLowerCase(),       actorName: "HOD",        remarks: newRemarks, actedOn: "" };
      const stage2 = { status: leave.clerk_status.toLowerCase(),     actorName: "Admin/Clerk",  remarks: newRemarks, actedOn: "" };
      const stage3 = { status: leave.principal_status.toLowerCase(), actorName: "Principal",   remarks: newRemarks, actedOn: "" };
      emailService.sendFinalDecisionNotification(
        leave.Faculty.email,
        leave.Faculty.name,
        "REJECTED",
        leave.leave_type,
        leave.from_date,
        leave.to_date,
        stage1,
        stage2,
        stage3,
        ""
      ).catch(err => console.error("[EmailService] Error sending rejected notification to faculty:", err));
    }

    res.json({
      message: "Leave request rejected. Faculty member notified.",
      leave
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.findAll({
      where: { faculty_id: req.user.id },
      include: [
        { model: User, as: "Approver", attributes: ["name", "role"] }
      ],
      order: [["applied_at", "DESC"]]
    });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    let whereClause = { status: "PENDING" };

    // Role-based pending actions queues: HOD, Principal, and Clerk each check their own pending stages
    if (req.user.role === "HOD") {
      whereClause = {
        status: "PENDING",
        hod_status: "PENDING",
        "$Faculty.department$": req.user.department
      };
    } else if (req.user.role === "PRINCIPAL") {
      whereClause = {
        status: "PENDING",
        principal_status: "PENDING"
      };
    } else if (req.user.role === "CLERK" || req.user.role === "ADMIN") {
      whereClause = {
        status: "PENDING",
        clerk_status: "PENDING"
      };
    }

    const pending = await Leave.findAll({
      where: whereClause,
      include: [
        { model: User, as: "Faculty", attributes: ["name", "email", "department", "role"] }
      ],
      order: [["applied_at", "ASC"]]
    });

    res.json(pending);
  } catch (err) {
    next(err);
  }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const { search, status, leave_type, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = {};

    if (status) {
      whereClause.status = status;
    }
    if (leave_type) {
      whereClause.leave_type = leave_type;
    }

    let facultyInclude = {
      model: User,
      as: "Faculty",
      attributes: ["name", "email", "department", "role"]
    };

    if (search) {
      facultyInclude.where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { department: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows } = await Leave.findAndCountAll({
      where: whereClause,
      include: [
        facultyInclude,
        { model: User, as: "Approver", attributes: ["name", "role"] }
      ],
      order: [["applied_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: rows
    });
  } catch (err) {
    next(err);
  }
};
