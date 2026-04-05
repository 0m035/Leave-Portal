const path = require("path");
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");

const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/faculty_leave_management";

const app = express();
const sessionStore = new Map();

const LEAVE_TYPES = [
  "Casual Leave",
  "Medical Leave",
  "Earned Leave"
];

const ROLE_LABELS = {
  faculty: "Faculty",
  hod: "Head of Department",
  admin: "Admin Office",
  principal: "Principal"
};

const AUTHORIZED_ACCOUNTS = [
  {
    username: "rankhambedevika@gmail.com",
    name: "Devika Rankhambe",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "ramesh.lavhe@abmspcoerpune.org",
    name: "Ramesh Lavhe",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "sayali.kokane@abmspcoerpune.org",
    name: "Sayali Kokane",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "ashok.kalal@abmspcoerpune.org",
    name: "Ashok Kalal",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "rajshri.nikam@abmspcoerpune.org",
    name: "Rajshri Nikam",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "akash.dodke@abmspcoerpune.org",
    name: "Akash Dodke",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "prajakta.khaire@abmspcoerpune.org",
    name: "Prajakta Khaire",
    role: "faculty",
    department: "Information Technology",
    designation: "Assistant Professor"
  },
  {
    username: "amit.kadam@abmspcoerpune.org",
    name: "Amit Kadam",
    role: "hod",
    department: "Information Technology",
    designation: "Head of Department"
  },
  {
    username: "office@abmspcoerpune.org",
    name: "Admin Office",
    role: "admin",
    department: "Administration Office",
    designation: "Administrative Officer"
  },
  {
    username: "sunil.thakre@abmspcoerpune.org",
    name: "Sunil Thakre",
    role: "principal",
    department: "Principal Office",
    designation: "Principal"
  }
];

const AUTHORIZED_ACCOUNT_MAP = new Map(
  AUTHORIZED_ACCOUNTS.map((account) => [account.username, account])
);

const PROOF_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];

const MAX_PROOF_SIZE_BYTES = 2.5 * 1024 * 1024;

const stageSchema = new mongoose.Schema({
  role: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "skipped"],
    default: "pending"
  },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorName: { type: String, default: "" },
  actedOn: { type: String, default: "" },
  remarks: { type: String, default: "" }
}, { _id: false });

const proofSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  dataUrl: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  role: { type: String, enum: ["faculty", "hod", "admin", "principal"], required: true },
  department: { type: String, required: true, trim: true },
  normalizedDepartment: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  leaveEntitlement: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

userSchema.index(
  { role: 1, normalizedDepartment: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "hod" }
  }
);

const leaveSchema = new mongoose.Schema({
  leaveCode: { type: String, required: true, unique: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  applicantName: { type: String, required: true },
  applicantRole: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  substituteTeacher: { type: String, required: true },
  leaveType: { type: String, enum: LEAVE_TYPES, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  proof: { type: proofSchema, default: null },
  appliedOn: { type: String, required: true },
  lastUpdated: { type: String, required: true },
  certificateNo: { type: String, default: "" },
  stage1: { type: stageSchema, required: true },
  stage2: { type: stageSchema, required: true },
  stage3: { type: stageSchema, required: true }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Leave = mongoose.model("Leave", leaveSchema);

app.use(express.json({ limit: "6mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      role,
      department,
      designation
    } = req.body || {};

    const normalizedUsername = String(username || "").trim().toLowerCase();
    const normalizedRole = String(role || "").trim().toLowerCase();
    const trimmedDepartment = String(department || "").trim();
    const normalizedDepartment = normalizeDepartmentName(trimmedDepartment);

    if (!name || !normalizedUsername || !password || !trimmedDepartment || !designation) {
      return res.status(400).json({ error: "Please complete all registration fields." });
    }

    if (!["faculty", "hod", "admin", "principal"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Please choose a valid role." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const approvedAccount = getAuthorizedAccount(normalizedUsername);
    if (!approvedAccount) {
      return res.status(403).json({
        error: "This Gmail is not approved for registration in the college leave system."
      });
    }

    if (approvedAccount.role !== normalizedRole) {
      return res.status(403).json({
        error: `This Gmail is approved only for ${ROLE_LABELS[approvedAccount.role]}.`
      });
    }

    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(409).json({ error: "This Gmail is already registered." });
    }

    const approvedDepartment = approvedAccount.department;
    const approvedNormalizedDepartment = normalizeDepartmentName(approvedDepartment);

    if (normalizedRole === "hod") {
      const existingHod = await User.findOne({
        role: "hod",
        $or: [
          { normalizedDepartment: approvedNormalizedDepartment },
          { department: approvedDepartment }
        ]
      }).collation({ locale: "en", strength: 2 });

      if (existingHod) {
        return res.status(409).json({
          error: `A HOD account already exists for the ${approvedDepartment} department.`
        });
      }
    }

    const { hash, salt } = hashPassword(String(password));
    const user = await User.create({
      name: approvedAccount.name,
      username: normalizedUsername,
      passwordHash: hash,
      passwordSalt: salt,
      role: approvedAccount.role,
      department: approvedDepartment,
      normalizedDepartment: approvedNormalizedDepartment,
      designation: approvedAccount.designation,
      leaveEntitlement: getDefaultEntitlement(approvedAccount.role)
    });

    const token = createSession(user._id.toString());
    return res.status(201).json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.role && error?.keyPattern?.normalizedDepartment) {
      return res.status(409).json({ error: "A HOD account already exists for this department." });
    }
    return res.status(500).json({ error: "Registration could not be completed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    const approvedAccount = getAuthorizedAccount(normalizedUsername);
    if (!approvedAccount || !user || approvedAccount.role !== user.role) {
      return res.status(401).json({ error: "Invalid Gmail or password." });
    }

    if (!user || !verifyPassword(String(password || ""), user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid Gmail or password." });
    }

    const token = createSession(user._id.toString());
    return res.json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: "Login could not be completed." });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  sessionStore.delete(req.token);
  res.json({ ok: true });
});

app.get("/api/bootstrap", requireAuth, async (req, res) => {
  try {
    const [users, leaves] = await Promise.all([
      getVisibleUsers(req.user),
      getVisibleLeaves(req.user)
    ]);

    res.json({
      user: serializeUser(req.user),
      users: users.map(serializeUser),
      leaves: leaves.map(serializeLeave)
    });
  } catch (error) {
    res.status(500).json({ error: "Dashboard data could not be loaded." });
  }
});

app.post("/api/leaves", requireAuth, async (req, res) => {
  try {
    if (!["faculty", "hod"].includes(req.user.role)) {
      return res.status(403).json({ error: "This role cannot submit leave requests." });
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      substituteTeacher,
      proof
    } = req.body || {};

    if (!LEAVE_TYPES.includes(String(leaveType || ""))) {
      return res.status(400).json({ error: "Please choose a valid leave type." });
    }

    if (!startDate || !endDate || !reason || !substituteTeacher) {
      return res.status(400).json({ error: "Please complete all leave application fields." });
    }

    let proofAttachment = null;
    try {
      proofAttachment = sanitizeProofAttachment(proof);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const days = calculateLeaveDays(String(startDate), String(endDate));
    if (days <= 0) {
      return res.status(400).json({ error: "End date must be the same as or after the start date." });
    }

    const entitlement = req.user.leaveEntitlement || {};
    const remaining = await getRemainingBalance(req.user._id, String(leaveType), entitlement);
    if (days > remaining) {
      return res.status(400).json({ error: `Insufficient remaining balance for ${leaveType}.` });
    }

    const today = getToday();
    const leaveCode = createLeaveCode();

    const leave = await Leave.create({
      leaveCode,
      applicantId: req.user._id,
      applicantName: req.user.name,
      applicantRole: req.user.role,
      department: req.user.department,
      designation: req.user.designation,
      substituteTeacher: String(substituteTeacher).trim(),
      leaveType: String(leaveType),
      startDate: String(startDate),
      endDate: String(endDate),
      days,
      reason: String(reason).trim(),
      proof: proofAttachment,
      appliedOn: today,
      lastUpdated: today,
      certificateNo: "",
      stage1: req.user.role === "hod"
        ? {
            role: "hod",
            status: "skipped",
            actorId: req.user._id,
            actorName: req.user.name,
            actedOn: today,
            remarks: "Applicant is the HOD; routed directly to Admin Office."
          }
        : {
            role: "hod",
            status: "pending",
            actorId: null,
            actorName: "",
            actedOn: "",
            remarks: ""
          },
      stage2: {
        role: "admin",
        status: "pending",
        actorId: null,
        actorName: "",
        actedOn: "",
        remarks: ""
      },
      stage3: {
        role: "principal",
        status: "pending",
        actorId: null,
        actorName: "",
        actedOn: "",
        remarks: ""
      }
    });

    return res.status(201).json({ leave: serializeLeave(leave) });
  } catch (error) {
    return res.status(500).json({ error: "Leave request could not be created." });
  }
});

app.delete("/api/leaves/:id", requireAuth, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: "Leave record not found." });
    }

    if (leave.applicantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can delete only your own leave records." });
    }

    if (getOverallStatus(leave) === "Approved") {
      return res.status(400).json({ error: "Approved leave records cannot be deleted." });
    }

    await leave.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Leave record could not be deleted." });
  }
});

app.post("/api/leaves/:id/decision", requireAuth, async (req, res) => {
  try {
    const { decision, remarks } = req.body || {};
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    if (!["approved", "rejected"].includes(String(decision || ""))) {
      return res.status(400).json({ error: "Please send a valid decision." });
    }

    if (!canUserActOnLeave(req.user, leave)) {
      return res.status(403).json({ error: "This leave request is not waiting for your action." });
    }

    const today = getToday();
    const safeRemarks = String(remarks || "").trim() || defaultDecisionRemark(String(decision), req.user.role);

    if (req.user.role === "hod") {
      leave.stage1 = {
        role: "hod",
        status: String(decision),
        actorId: req.user._id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };
    } else if (req.user.role === "admin") {
      leave.stage2 = {
        role: "admin",
        status: String(decision),
        actorId: req.user._id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };
    } else if (req.user.role === "principal") {
      leave.stage3 = {
        role: "principal",
        status: String(decision),
        actorId: req.user._id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };

      if (decision === "approved") {
        leave.certificateNo = leave.certificateNo || `CERT-${new Date().getFullYear()}-${leave.leaveCode.split("-").pop()}`;
      }
    }

    leave.lastUpdated = today;
    await leave.save();
    return res.json({ leave: serializeLeave(leave) });
  } catch (error) {
    return res.status(500).json({ error: "The decision could not be recorded." });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const token = authHeader.slice(7);
    const session = sessionStore.get(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      sessionStore.delete(token);
      return res.status(401).json({ error: "Session is no longer valid." });
    }

    req.token = token;
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed." });
  }
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    department: user.department,
    designation: user.designation,
    leaveEntitlement: user.leaveEntitlement || null,
    createdAt: user.createdAt
  };
}

function serializeLeave(leave) {
  return {
    id: leave._id.toString(),
    leaveCode: leave.leaveCode,
    applicantId: leave.applicantId.toString(),
    applicantName: leave.applicantName,
    applicantRole: leave.applicantRole,
    department: leave.department,
    designation: leave.designation,
    substituteTeacher: leave.substituteTeacher,
    leaveType: leave.leaveType,
    startDate: leave.startDate,
    endDate: leave.endDate,
    days: leave.days,
    reason: leave.reason,
    proof: leave.proof ? {
      fileName: leave.proof.fileName,
      mimeType: leave.proof.mimeType,
      dataUrl: leave.proof.dataUrl,
      size: leave.proof.size
    } : null,
    appliedOn: leave.appliedOn,
    lastUpdated: leave.lastUpdated,
    certificateNo: leave.certificateNo,
    stage1: serializeStage(leave.stage1),
    stage2: serializeStage(leave.stage2),
    stage3: serializeStage(leave.stage3)
  };
}

function serializeStage(stage) {
  return {
    role: stage.role,
    status: stage.status,
    actorId: stage.actorId ? stage.actorId.toString() : null,
    actorName: stage.actorName || "",
    actedOn: stage.actedOn || "",
    remarks: stage.remarks || ""
  };
}

function getDefaultEntitlement(role) {
  if (role === "faculty" || role === "hod") {
    return {
      "Casual Leave": 8,
      "Medical Leave": 10,
      "Earned Leave": 30
    };
  }

  return null;
}

function normalizeDepartmentName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getAuthorizedAccount(username) {
  return AUTHORIZED_ACCOUNT_MAP.get(String(username || "").trim().toLowerCase()) || null;
}

function sanitizeProofAttachment(proof) {
  if (!proof) {
    return null;
  }

  const fileName = String(proof.fileName || "").trim();
  const mimeType = String(proof.mimeType || "").trim().toLowerCase();
  const dataUrl = String(proof.dataUrl || "").trim();
  const size = Number(proof.size || estimateDataUrlBytes(dataUrl));

  if (!fileName || !mimeType || !dataUrl) {
    throw new Error("The uploaded proof file is incomplete.");
  }

  if (!PROOF_MIME_TYPES.includes(mimeType)) {
    throw new Error("Proof must be an image, PDF, DOC, or DOCX file.");
  }

  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    throw new Error("The uploaded proof file could not be verified.");
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_PROOF_SIZE_BYTES) {
    throw new Error("Proof file must be 2.5 MB or smaller.");
  }

  return {
    fileName: fileName.slice(0, 160),
    mimeType,
    dataUrl,
    size
  };
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, salt, hash) {
  const attempt = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(hash, "hex"));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessionStore.set(token, { userId, createdAt: Date.now() });
  return token;
}

async function getVisibleUsers(user) {
  if (user.role === "faculty") {
    return [user];
  }
  if (user.role === "hod") {
    return User.find({
      $or: [
        { _id: user._id },
        { department: user.department }
      ]
    }).sort({ name: 1 });
  }
  return User.find({}).sort({ name: 1 });
}

async function getVisibleLeaves(user) {
  if (user.role === "faculty") {
    return Leave.find({ applicantId: user._id }).sort({ createdAt: -1 });
  }
  if (user.role === "hod") {
    return Leave.find({ department: user.department }).sort({ createdAt: -1 });
  }
  return Leave.find({}).sort({ createdAt: -1 });
}

async function getRemainingBalance(userId, leaveType, entitlement) {
  const result = await Leave.aggregate([
    {
      $match: {
        applicantId: new mongoose.Types.ObjectId(userId),
        leaveType,
        "stage3.status": "approved"
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: "$days" }
      }
    }
  ]);

  const approvedDays = result[0]?.totalDays || 0;
  return Math.max((entitlement[leaveType] || 0) - approvedDays, 0);
}

function canUserActOnLeave(user, leave) {
  if (getOverallStatus(leave) !== "Pending") {
    return false;
  }

  if (user.role === "hod") {
    return leave.department === user.department && leave.stage1.status === "pending";
  }

  if (user.role === "admin") {
    return ["approved", "skipped"].includes(leave.stage1.status) && leave.stage2.status === "pending";
  }

  if (user.role === "principal") {
    return leave.stage2.status === "approved" && leave.stage3.status === "pending";
  }

  return false;
}

function getOverallStatus(leave) {
  if ([leave.stage1.status, leave.stage2.status, leave.stage3.status].includes("rejected")) {
    return "Rejected";
  }

  if (leave.stage3.status === "approved") {
    return "Approved";
  }

  return "Pending";
}

function defaultDecisionRemark(decision, role) {
  if (decision === "approved") {
    return `Approved by ${ROLE_LABELS[role]} after review.`;
  }

  return `Rejected by ${ROLE_LABELS[role]} after review.`;
}

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();
  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function createLeaveCode() {
  return `LV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Faculty leave management system running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server.", error);
    process.exit(1);
  }
}

start();
