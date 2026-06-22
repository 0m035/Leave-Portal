/**
 * emailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Notification dispatch layer for APCOER Faculty Leave Portal.
 * Delegates all SMTP transport to mailService.js and templating to emailTemplates/.
 *
 * Supported environment variables (set in .env):
 *   MAIL_HOST     = smtp.gmail.com       (also accepts SMTP_HOST for compat)
 *   MAIL_PORT     = 587
 *   MAIL_USER     = yourgmail@gmail.com  (also accepts SMTP_USER)
 *   MAIL_PASSWORD = your_app_password    (also accepts SMTP_PASS)
 *   MAIL_FROM     = yourgmail@gmail.com  (also accepts SMTP_FROM)
 *   PORTAL_URL    = https://your-domain  (optional, defaults to localhost:3000)
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const mailService    = require("./mailService");
const { templates }  = require("./emailTemplates");
const crypto         = require("crypto");

/* ── Firestore notification logger ──────────────────────────────────────────── */

/**
 * Writes a notification log entry to Firestore (fire-and-forget).
 * Safe to call without await — failures are caught internally.
 */
async function logNotificationToFirestore(db, notifId, receiverEmail, subject, status, errorLog) {
  if (!db) return;
  try {
    // Use Admin SDK — db is already a firebase-admin Firestore instance
    await db.collection("notifications").doc(notifId).set({
      receiver_email: receiverEmail,
      subject,
      status,                              // "PENDING" | "SENT" | "FAILED"
      sent_at: status === "SENT" ? new Date().toISOString() : null,
      retry_count: 0,
      error_log: errorLog || ""
    });
  } catch (err) {
    console.error(`[EmailService] Firestore log failed for ${notifId}:`, err.message);
  }
}

/* ── Core internal dispatcher ────────────────────────────────────────────────── */

/**
 * Dispatches a single email via mailService and logs the result to Firestore.
 *
 * @param {string} receiverEmail
 * @param {string} subject
 * @param {string} htmlContent
 * @param {object|null} db  - Firestore db instance (optional)
 */
async function sendNotificationEmail(receiverEmail, subject, htmlContent, db) {
  const notifId = `notif-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`;

  // Log PENDING to Firestore
  await logNotificationToFirestore(db, notifId, receiverEmail, subject, "PENDING", "");

  const result = await mailService.sendMail({
    to:      receiverEmail,
    subject,
    html:    htmlContent
  });

  if (result.success) {
    await logNotificationToFirestore(db, notifId, receiverEmail, subject, "SENT", "");
  } else {
    await logNotificationToFirestore(db, notifId, receiverEmail, subject, "FAILED", result.error || "");
  }

  return result.success;
}

/* ── Public API ──────────────────────────────────────────────────────────────── */

module.exports = {

  /**
   * Sends the "New Leave Submitted" notification to HOD, Admin, and Principal.
   * Called immediately after a faculty member submits a leave request.
   *
   * @param {string} receiverEmail       - HOD / Admin / Principal's college email
   * @param {string} facultyName
   * @param {string} department
   * @param {string} designation
   * @param {string} leaveType
   * @param {string} startDate
   * @param {string} endDate
   * @param {string} reason
   * @param {string} substituteTeacher
   * @param {object|null} db             - Firestore db (for logging)
   * @param {string} [leaveId]           - Optional leave document ID
   * @param {string} [leaveCode]         - Optional human-readable leave code
   */
  sendNewLeaveNotification: async (
    receiverEmail,
    facultyName,
    department,
    designation,
    leaveType,
    startDate,
    endDate,
    reason,
    substituteTeacher,
    db,
    leaveId,
    leaveCode
  ) => {
    console.log(`[EmailService] 📤 Dispatching new-leave notification → ${receiverEmail}`);

    const subject = `[New Leave Request] Submitted by ${facultyName} (${department})`;
    const html = templates.newLeaveApplication({
      facultyName,
      department,
      designation,
      leaveType,
      startDate,
      endDate,
      reason,
      substituteTeacher,
      leaveId:   leaveId   || "",
      leaveCode: leaveCode || ""
    });

    return sendNotificationEmail(receiverEmail, subject, html, db);
  },

  /**
   * Sends the final leave outcome notification to the Faculty member.
   * Called after all three stages (HOD, Admin, Principal) have decided.
   *
   * @param {string} receiverEmail  - Faculty member's college email
   * @param {string} facultyName
   * @param {string} status         - "Approved" | "Rejected"
   * @param {object} leave          - The full leave record from Firestore
   * @param {object|null} db        - Firestore db (for logging)
   */
  sendLeaveStatusNotification: async (receiverEmail, facultyName, status, leave, db) => {
    const finalStatus = String(status || "").toUpperCase();
    console.log(`[EmailService] 📤 Dispatching final decision (${finalStatus}) notification → ${receiverEmail}`);

    const subject = finalStatus === "APPROVED"
      ? `✅ [Leave Approved] Your ${leave.leaveType} request has been approved`
      : `❌ [Leave Rejected] Your ${leave.leaveType} request has been declined`;

    const isApproved = finalStatus === "APPROVED";
    const html = isApproved
      ? templates.leaveApproved({
          facultyName,
          leaveType:     leave.leaveType,
          startDate:     leave.startDate,
          endDate:       leave.endDate,
          finalStatus,
          stage1:        leave.stage1,
          stage2:        leave.stage2,
          stage3:        leave.stage3,
          certificateNo: leave.certificateNo || ""
        })
      : templates.leaveRejected({
          facultyName,
          leaveType:  leave.leaveType,
          startDate:  leave.startDate,
          endDate:    leave.endDate,
          finalStatus,
          stage1:     leave.stage1,
          stage2:     leave.stage2,
          stage3:     leave.stage3
        });

    return sendNotificationEmail(receiverEmail, subject, html, db);
  }
};
