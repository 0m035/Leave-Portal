const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} = require("firebase/firestore");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} = require("firebase/storage");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);

const firebaseConfig = {
  apiKey: cleanEnvValue(process.env.FIREBASE_API_KEY || ""),
  authDomain: cleanEnvValue(process.env.FIREBASE_AUTH_DOMAIN || ""),
  projectId: cleanEnvValue(process.env.FIREBASE_PROJECT_ID || ""),
  storageBucket: cleanEnvValue(process.env.FIREBASE_STORAGE_BUCKET || ""),
  messagingSenderId: cleanEnvValue(process.env.FIREBASE_MESSAGING_SENDER_ID || ""),
  appId: cleanEnvValue(process.env.FIREBASE_APP_ID || ""),
  measurementId: cleanEnvValue(process.env.FIREBASE_MEASUREMENT_ID || "")
};

const app = express();
const sessionStore = new Map();

let db = null;
let storage = null;

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

const PROOF_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];

const MAX_PROOF_SIZE_BYTES = 2.5 * 1024 * 1024;

app.use(express.json({ limit: "6mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: Boolean(db),
    storage: Boolean(storage)
  });
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

    const normalizedUsername = normalizeUsername(username);
    const normalizedRole = String(role || "").trim().toLowerCase();
    const trimmedDepartment = String(department || "").trim();

    if (!name || !normalizedUsername || !password || !trimmedDepartment || !designation) {
      return res.status(400).json({ error: "Please complete all registration fields." });
    }

    if (!["faculty", "hod", "admin", "principal"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Please choose a valid role." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(String(password))) {
      return res.status(400).json({ error: "Password must not contain special characters (letters and numbers only)." });
    }

    const existing = await findUserById(normalizedUsername);
    if (existing) {
      return res.status(409).json({ error: "This Gmail is already registered." });
    }

    const normalizedDepartment = normalizeDepartmentName(trimmedDepartment);
    const allUsers = await listUsers();

    // Check for unique Principal
    if (normalizedRole === "principal") {
      const existingPrincipal = allUsers.find(u => u.role === "principal");
      if (existingPrincipal) {
        return res.status(409).json({ error: "A Principal account already exists in the system." });
      }
    }

    // Check for unique HOD per department
    if (normalizedRole === "hod") {
      const existingHod = allUsers.find(u => u.role === "hod" && u.normalizedDepartment === normalizedDepartment);
      if (existingHod) {
        return res.status(409).json({ 
          error: `A HOD account already exists for the ${trimmedDepartment} department.` 
        });
      }
    }

    const { hash, salt } = hashPassword(String(password));
    const user = await createUserRecord({
      id: normalizedUsername,
      name: String(name).trim(),
      username: normalizedUsername,
      passwordHash: hash,
      passwordSalt: salt,
      role: normalizedRole,
      department: trimmedDepartment,
      normalizedDepartment,
      designation: String(designation).trim(),
      leaveEntitlement: getDefaultEntitlement(normalizedRole)
    });

    const token = createSession(user.id);
    return res.status(201).json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration could not be completed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const normalizedUsername = normalizeUsername(username);
    const user = await findUserById(normalizedUsername);

    if (!user) {
      return res.status(401).json({ error: "Invalid Gmail or password." });
    }

    if (!verifyPassword(String(password || ""), user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid Gmail or password." });
    }

    const token = createSession(user.id);
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
    const remaining = await getRemainingBalance(req.user.id, String(leaveType), entitlement);
    if (days > remaining) {
      return res.status(400).json({ error: `Insufficient remaining balance for ${leaveType}.` });
    }

    const today = getToday();
    const leaveId = createLeaveDocumentId();
    let storedProof = null;

    try {
      storedProof = await storeProofAttachment(leaveId, proofAttachment);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const leave = await createLeaveRecord({
      id: leaveId,
      leaveCode: createLeaveCode(),
      applicantId: req.user.id,
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
      proof: storedProof,
      appliedOn: today,
      lastUpdated: today,
      certificateNo: "",
      stage1: req.user.role === "hod"
        ? {
            role: "hod",
            status: "skipped",
            actorId: req.user.id,
            actorName: req.user.name,
            actedOn: today,
            remarks: "Applicant is the HOD; routed directly to Admin Office."
          }
        : createPendingStage("hod"),
      stage2: createPendingStage("admin"),
      stage3: createPendingStage("principal")
    });

    return res.status(201).json({ leave: serializeLeave(leave) });
  } catch (error) {
    return res.status(500).json({ error: "Leave request could not be created." });
  }
});

app.delete("/api/leaves/:id", requireAuth, async (req, res) => {
  try {
    const leave = await findLeaveById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: "Leave record not found." });
    }

    if (leave.applicantId !== req.user.id) {
      return res.status(403).json({ error: "You can delete only your own leave records." });
    }

    if (getOverallStatus(leave) === "Approved") {
      return res.status(400).json({ error: "Approved leave records cannot be deleted." });
    }

    await deleteProofAttachment(leave.proof);
    await deleteLeaveRecord(leave.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Leave record could not be deleted." });
  }
});

app.post("/api/leaves/:id/decision", requireAuth, async (req, res) => {
  try {
    const { decision, remarks } = req.body || {};
    const leave = await findLeaveById(req.params.id);

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
        actorId: req.user.id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };
    } else if (req.user.role === "admin") {
      leave.stage2 = {
        role: "admin",
        status: String(decision),
        actorId: req.user.id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };
    } else if (req.user.role === "principal") {
      leave.stage3 = {
        role: "principal",
        status: String(decision),
        actorId: req.user.id,
        actorName: req.user.name,
        actedOn: today,
        remarks: safeRemarks
      };

      if (decision === "approved") {
        leave.certificateNo = leave.certificateNo || `CERT-${new Date().getFullYear()}-${leave.leaveCode.split("-").pop()}`;
      }
    }

    leave.lastUpdated = today;
    const savedLeave = await saveLeaveRecord(leave);
    return res.json({ leave: serializeLeave(savedLeave) });
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

    const user = await findUserById(session.userId);
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
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    department: user.department,
    designation: user.designation,
    leaveEntitlement: user.leaveEntitlement || null,
    createdAt: user.createdAt || ""
  };
}

function serializeLeave(leave) {
  return {
    id: leave.id,
    leaveCode: leave.leaveCode,
    applicantId: leave.applicantId,
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
    proof: serializeProof(leave.proof),
    appliedOn: leave.appliedOn,
    lastUpdated: leave.lastUpdated,
    certificateNo: leave.certificateNo,
    stage1: serializeStage(leave.stage1),
    stage2: serializeStage(leave.stage2),
    stage3: serializeStage(leave.stage3)
  };
}

function serializeProof(proof) {
  if (!proof) {
    return null;
  }

  const dataUrl = proof.downloadUrl || proof.dataUrl || "";
  return {
    fileName: proof.fileName,
    mimeType: proof.mimeType,
    dataUrl,
    downloadUrl: dataUrl,
    size: proof.size
  };
}

function serializeStage(stage) {
  return {
    role: stage.role,
    status: stage.status,
    actorId: stage.actorId || null,
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

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
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

async function storeProofAttachment(leaveId, proof) {
  if (!proof) {
    return null;
  }

  if (!storage) {
    throw new Error("Proof uploads require Firebase Storage to be configured.");
  }

  const base64 = String(proof.dataUrl || "").split(",")[1] || "";
  const buffer = Buffer.from(base64, "base64");
  const safeFileName = sanitizeFileName(proof.fileName);
  const storagePath = `leave-proofs/${leaveId}/${Date.now()}-${safeFileName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, buffer, {
    contentType: proof.mimeType
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return {
    fileName: proof.fileName,
    mimeType: proof.mimeType,
    size: proof.size,
    storagePath,
    downloadUrl
  };
}

async function deleteProofAttachment(proof) {
  if (!proof || !proof.storagePath || !storage) {
    return;
  }

  try {
    await deleteObject(ref(storage, proof.storagePath));
  } catch (_error) {
    // Keep leave deletion resilient even if the storage object was already removed.
  }
}

function sanitizeFileName(fileName) {
  return String(fileName || "proof")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
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

  const users = await listUsers();
  if (user.role === "hod") {
    return users
      .filter((member) => member.department === user.department)
      .sort(sortUsersByName);
  }

  return users.sort(sortUsersByName);
}

async function getVisibleLeaves(user) {
  const leaves = await listLeaves();

  if (user.role === "faculty") {
    return leaves
      .filter((leave) => leave.applicantId === user.id)
      .sort(sortLeavesByCreatedAtDesc);
  }

  if (user.role === "hod") {
    return leaves
      .filter((leave) => leave.department === user.department)
      .sort(sortLeavesByCreatedAtDesc);
  }

  return leaves.sort(sortLeavesByCreatedAtDesc);
}

async function getRemainingBalance(userId, leaveType, entitlement) {
  const leaves = await listLeavesForApplicant(userId);
  const approvedDays = leaves
    .filter((leave) => leave.leaveType === leaveType && leave.stage3.status === "approved")
    .reduce((sum, leave) => sum + Number(leave.days || 0), 0);

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

function createLeaveDocumentId() {
  return crypto.randomUUID();
}

function createPendingStage(role) {
  return {
    role,
    status: "pending",
    actorId: null,
    actorName: "",
    actedOn: "",
    remarks: ""
  };
}

/* ── Firestore Data Access Layer ─────────────────────────────────── */

async function createUserRecord(data) {
  const now = new Date().toISOString();
  const record = {
    name: data.name,
    username: data.username,
    passwordHash: data.passwordHash,
    passwordSalt: data.passwordSalt,
    role: data.role,
    department: data.department,
    normalizedDepartment: data.normalizedDepartment,
    designation: data.designation,
    leaveEntitlement: data.leaveEntitlement || null,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(doc(db, "users", data.id), record);
  return {
    id: data.id,
    ...record
  };
}

async function createLeaveRecord(data) {
  const now = new Date().toISOString();
  const record = {
    leaveCode: data.leaveCode,
    applicantId: data.applicantId,
    applicantName: data.applicantName,
    applicantRole: data.applicantRole,
    department: data.department,
    designation: data.designation,
    substituteTeacher: data.substituteTeacher,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    days: data.days,
    reason: data.reason,
    proof: data.proof || null,
    appliedOn: data.appliedOn,
    lastUpdated: data.lastUpdated,
    certificateNo: data.certificateNo || "",
    stage1: data.stage1,
    stage2: data.stage2,
    stage3: data.stage3,
    createdAt: now,
    createdAtMs: Date.now(),
    updatedAt: now,
    updatedAtMs: Date.now()
  };

  await setDoc(doc(db, "leaves", data.id), record);
  return {
    id: data.id,
    ...record
  };
}

async function saveLeaveRecord(leave) {
  const now = new Date().toISOString();
  const record = {
    leaveCode: leave.leaveCode,
    applicantId: leave.applicantId,
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
    proof: leave.proof || null,
    appliedOn: leave.appliedOn,
    lastUpdated: leave.lastUpdated,
    certificateNo: leave.certificateNo || "",
    stage1: leave.stage1,
    stage2: leave.stage2,
    stage3: leave.stage3,
    createdAt: leave.createdAt || now,
    createdAtMs: leave.createdAtMs || Date.now(),
    updatedAt: now,
    updatedAtMs: Date.now()
  };

  await setDoc(doc(db, "leaves", leave.id), record);
  return {
    id: leave.id,
    ...record
  };
}

async function deleteLeaveRecord(leaveId) {
  await deleteDoc(doc(db, "leaves", leaveId));
}

async function findUserById(userId) {
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function findLeaveById(leaveId) {
  const snapshot = await getDoc(doc(db, "leaves", leaveId));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function listUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(mapSnapshot);
}

async function listLeaves() {
  const snapshot = await getDocs(collection(db, "leaves"));
  return snapshot.docs.map(mapSnapshot);
}

async function listLeavesForApplicant(applicantId) {
  const q = query(
    collection(db, "leaves"),
    where("applicantId", "==", applicantId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapSnapshot);
}

async function findHodByDepartment(normalizedDepartment) {
  const users = await listUsers();
  return users.find((user) => user.role === "hod" && user.normalizedDepartment === normalizedDepartment) || null;
}

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

function sortUsersByName(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
}

function sortLeavesByCreatedAtDesc(a, b) {
  return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
}

/* ── Firebase Initialization ─────────────────────────────────────── */

function initializeFirebaseServices() {
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  storage = firebaseConfig.storageBucket ? getStorage(firebaseApp) : null;
}

async function start() {
  try {
    initializeFirebaseServices();
    app.listen(PORT, () => {
      console.log(`Faculty leave management system running on http://localhost:${PORT}`);
      console.log(`Firebase Firestore connected for project: ${firebaseConfig.projectId || "default"}`);
      if (storage) {
        console.log(`Firebase Storage bucket configured: ${firebaseConfig.storageBucket}`);
      }
    });
  } catch (error) {
    console.error("Failed to start the server.", error);
    process.exit(1);
  }
}

start();

/* ── Environment File Loader ─────────────────────────────────────── */

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function cleanEnvValue(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}
