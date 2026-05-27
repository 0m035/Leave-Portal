/**
 * services/emailService.js  (notification-module backend)
 * ─────────────────────────────────────────────────────────────────────────────
 * Email notification service using Gmail SMTP via Nodemailer.
 * Reads SMTP config from config/smtp.js and logs records to the Notification model.
 * Implements exponential-backoff retry (max 3 attempts: 5s → 15s → 45s).
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const { transporter, fromEmail } = require("../config/smtp");
const Notification = require("../models/Notification");
const crypto = require("crypto");

/* ── HTML Template helpers ──────────────────────────────────────────────────── */

const BRAND   = "#8d2b2b";
const ACCENT  = "#f47a2f";
const SUCCESS = "#2d7a50";
const DANGER  = "#b5323d";
const PORTAL_URL = process.env.PORTAL_URL || "http://localhost:3000";

function baseShell(headerBg, title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f0ee;color:#3a231d}
    .wrap{padding:32px 16px;background:#f5f0ee}
    .card{max-width:620px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;
          box-shadow:0 16px 48px rgba(83,31,25,.10);border-top:7px solid ${headerBg}}
    .hdr{background:${headerBg};padding:34px 32px;text-align:center;color:#fff}
    .hdr h1{font-size:22px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
    .hdr p{font-size:13px;opacity:.88}
    .bod{padding:34px 32px;line-height:1.65}
    .greeting{font-size:16px;color:#6b4f47;margin-bottom:18px}
    .intro{font-size:14px;color:#7a5c54;margin-bottom:22px}
    .panel{background:#fdf7f5;border-left:5px solid ${ACCENT};border-radius:10px;padding:22px 20px;margin-bottom:28px}
    .dt{width:100%;border-collapse:collapse}
    .dt td{padding:9px 0;font-size:13.5px;border-bottom:1px solid rgba(141,43,43,.07);vertical-align:top}
    .dt tr:last-child td{border-bottom:none}
    .lbl{font-weight:700;color:#a07870;width:36%;text-transform:uppercase;font-size:11.5px;letter-spacing:.5px;padding-right:12px}
    .val{color:#2c1a14;font-weight:500}
    .badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
    .bo{background:#fdeee0;color:${ACCENT}}
    .bg{background:#dff4ea;color:${SUCCESS}}
    .br{background:#fde8ea;color:${DANGER}}
    .bw{background:#efe9e7;color:#8d6a62}
    .sec{font-size:12px;font-weight:700;text-transform:uppercase;color:#b09090;letter-spacing:.7px;
         margin:26px 0 12px;border-bottom:1px solid rgba(141,43,43,.08);padding-bottom:7px}
    .ft{width:100%;border-collapse:collapse}
    .ft th{text-align:left;font-size:11px;text-transform:uppercase;color:#b09090;padding:6px 0;
            border-bottom:2px solid rgba(141,43,43,.09)}
    .ft th:nth-child(2){text-align:center;width:110px}
    .ft th:last-child{text-align:right}
    .ft td{padding:11px 0;font-size:13px;border-bottom:1px solid rgba(141,43,43,.05);color:#3a231d}
    .ft td:nth-child(2){text-align:center}
    .ft td:last-child{text-align:right;font-style:italic;color:#7a5c54;font-size:12px}
    .hero{text-align:center;padding:22px 20px;background:#fafaf9;border-radius:12px;
           border:1px solid rgba(141,43,43,.08);margin-bottom:24px}
    .bb{display:inline-block;padding:10px 28px;border-radius:40px;font-size:20px;font-weight:800;text-transform:uppercase}
    .bw2{text-align:center;margin:30px 0 8px}
    .btn{display:inline-block;padding:13px 32px;border-radius:11px;font-weight:700;font-size:14px;
          text-decoration:none;letter-spacing:.5px;box-shadow:0 4px 16px rgba(141,43,43,.18)}
    .foot{background:#fdfbfa;padding:20px 32px;text-align:center;font-size:12px;color:#c0a099;
           border-top:1px solid rgba(141,43,43,.06);line-height:1.7}
    .ts{font-size:11px;color:#cbb0ab;margin-top:6px}
  </style>
</head>
<body>
  <div class="wrap"><div class="card">
    <div class="hdr">
      <div style="font-size:32px;margin-bottom:12px">🎓</div>
      <h1>${title}</h1>
      <p>APCOER Faculty Leave Management System</p>
    </div>
    <div class="bod">${bodyHtml}</div>
    <div class="foot">
      Automated message from <strong>APCOER Leave Portal</strong>. Do not reply directly.
      <div class="ts">Generated: ${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</div>
    </div>
  </div></div>
</body></html>`;
}

function stageRow(label, stage) {
  if (!stage) return "";
  const s = String(stage.status || "pending").toLowerCase();
  const [cls, txt] = s === "approved" ? ["bg","✓ Approved"] :
                     s === "rejected" ? ["br","✗ Rejected"] :
                     s === "skipped"  ? ["bw","⟶ Skipped"]  :
                                        ["bo","⏳ Pending"];
  const actor   = stage.actorName ? ` <span style="font-size:11px;color:#b09090;">(${stage.actorName})</span>` : "";
  const date    = stage.actedOn   ? `<br><span style="font-size:11px;color:#c5a09a;font-weight:400;">${stage.actedOn}</span>` : "";
  const remarks = stage.remarks   || "—";
  return `<tr>
    <td style="font-weight:600;color:#5a3d35;">${label}${actor}${date}</td>
    <td><span class="badge ${cls}">${txt}</span></td>
    <td>${remarks}</td>
  </tr>`;
}

/**
 * Template: New Leave Application (to HOD/Admin/Principal)
 */
function getNewLeaveTemplate(facultyName, department, designation, leaveType, fromDate, toDate, reason, substituteTeacher, leaveCode) {
  const body = `
    <p class="greeting">Hello,</p>
    <p class="intro">A new faculty leave application is <strong>awaiting your review</strong> in the portal:</p>
    <div class="panel">
      <table class="dt">
        <tr><td class="lbl">Faculty Member</td><td class="val"><strong>${facultyName}</strong></td></tr>
        <tr><td class="lbl">Department</td><td class="val">${department}</td></tr>
        <tr><td class="lbl">Designation</td><td class="val">${designation || "—"}</td></tr>
        <tr><td class="lbl">Leave Type</td><td class="val"><span class="badge bo">${leaveType}</span></td></tr>
        <tr><td class="lbl">Period</td><td class="val"><strong>${fromDate}</strong> → <strong>${toDate}</strong></td></tr>
        <tr><td class="lbl">Substitute</td><td class="val">${substituteTeacher || "Not Specified"}</td></tr>
        <tr><td class="lbl">Reason</td><td class="val"><em>${reason}</em></td></tr>
        ${leaveCode ? `<tr><td class="lbl">Leave Code</td><td class="val" style="font-family:monospace;">${leaveCode}</td></tr>` : ""}
      </table>
    </div>
    <p style="font-size:14px;color:#7a5c54;margin-bottom:28px;">Please log in to the portal to <strong>Approve</strong> or <strong>Reject</strong> this request.</p>
    <div class="bw2"><a href="${PORTAL_URL}" class="btn" style="background:${BRAND};color:#fff;">🔐 &nbsp;Review in Portal</a></div>`;
  return baseShell(BRAND, "New Leave Application", body);
}

/**
 * Template: Leave APPROVED (to Faculty)
 */
function getLeaveApprovedTemplate(facultyName, leaveType, fromDate, toDate, stage1, stage2, stage3, certificateNo) {
  const body = `
    <p class="greeting">Dear <strong>${facultyName}</strong>,</p>
    <p class="intro">Your <strong>${leaveType}</strong> application for <strong>${fromDate} to ${toDate}</strong> has been <strong>approved</strong> by all authorities.</p>
    <div class="hero">
      <div class="bb" style="background:#dff4ea;color:${SUCCESS};">✅ &nbsp; APPROVED</div>
      ${certificateNo ? `<p style="margin-top:14px;font-size:13px;color:#7a5c54;">Certificate No: <strong style="font-family:monospace;">${certificateNo}</strong></p>` : ""}
    </div>
    <div class="sec">Approval Flow Summary</div>
    <table class="ft">
      <thead><tr><th>Authority</th><th>Decision</th><th style="text-align:right;">Remarks</th></tr></thead>
      <tbody>${stageRow("HOD (Dept. Head)", stage1)}${stageRow("Admin Office", stage2)}${stageRow("Principal", stage3)}</tbody>
    </table>
    <p style="font-size:13px;color:#7a5c54;margin-top:26px;">Your leave balance has been updated. View your dashboard for full details.</p>
    <div class="bw2"><a href="${PORTAL_URL}" class="btn" style="background:${SUCCESS};color:#fff;">📋 &nbsp;View Leave Records</a></div>`;
  return baseShell(SUCCESS, "Leave Request Approved", body);
}

/**
 * Template: Leave REJECTED (to Faculty)
 */
function getLeaveRejectedTemplate(facultyName, leaveType, fromDate, toDate, stage1, stage2, stage3) {
  let rejectedBy = "an approval authority";
  for (const [label, st] of [["HOD", stage1], ["Admin Office", stage2], ["Principal", stage3]]) {
    if (st && st.status === "rejected") {
      rejectedBy = st.actorName ? `${label} (${st.actorName})` : label;
      break;
    }
  }
  const body = `
    <p class="greeting">Dear <strong>${facultyName}</strong>,</p>
    <p class="intro">We regret to inform you that your <strong>${leaveType}</strong> application for <strong>${fromDate} to ${toDate}</strong> has been <strong>declined</strong> by ${rejectedBy}.</p>
    <div class="hero">
      <div class="bb" style="background:#fde8ea;color:${DANGER};">❌ &nbsp; REJECTED</div>
    </div>
    <div class="sec">Approval Flow Summary</div>
    <table class="ft">
      <thead><tr><th>Authority</th><th>Decision</th><th style="text-align:right;">Remarks</th></tr></thead>
      <tbody>${stageRow("HOD (Dept. Head)", stage1)}${stageRow("Admin Office", stage2)}${stageRow("Principal", stage3)}</tbody>
    </table>
    <p style="font-size:13px;color:#7a5c54;margin-top:26px;">If you wish to discuss this outcome, please contact your HOD or the Admin Office directly.</p>
    <div class="bw2"><a href="${PORTAL_URL}" class="btn" style="background:${DANGER};color:#fff;">📋 &nbsp;View Leave History</a></div>`;
  return baseShell(DANGER, "Leave Request Rejected", body);
}

/* ── Core dispatcher with retry ─────────────────────────────────────────────── */

async function sendNotificationEmail(receiverEmail, subject, htmlContent, currentRetry = 0) {
  const notifId = `notif-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`;

  let notifLog;
  try {
    notifLog = await Notification.create({
      notification_id: notifId,
      receiver_email: receiverEmail,
      subject,
      message: htmlContent,
      status: "PENDING",
      retry_count: currentRetry
    });
  } catch (err) {
    console.error("[EmailService] Failed to create Notification log entry:", err.message);
  }

  const mailOptions = {
    from: fromEmail,
    to: receiverEmail,
    subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email delivered to ${receiverEmail} | MessageID: ${info.messageId}`);
    if (notifLog) await notifLog.update({ status: "SENT", sent_at: new Date() });
    return true;
  } catch (error) {
    console.error(`[EmailService] ❌ Delivery failed for ${receiverEmail} (attempt ${currentRetry + 1}): ${error.message}`);
    if (notifLog) await notifLog.update({ status: "FAILED", error_log: error.stack || error.message });

    const MAX_ATTEMPTS = 3;
    if (currentRetry < MAX_ATTEMPTS - 1) {
      const delayMs = Math.pow(3, currentRetry) * 5000; // 5s → 15s → 45s
      console.log(`[EmailService] 🔁 Scheduling retry ${currentRetry + 2} in ${delayMs / 1000}s...`);
      setTimeout(async () => {
        if (notifLog) await notifLog.update({ retry_count: currentRetry + 1 }).catch(() => {});
        await sendNotificationEmail(receiverEmail, subject, htmlContent, currentRetry + 1);
      }, delayMs);
    } else {
      console.error(`[EmailService] 🚫 Max retries reached for ${receiverEmail}.`);
    }
    return false;
  }
}

/* ── Public API ──────────────────────────────────────────────────────────────── */

module.exports = {
  /**
   * New leave application notification → sent to HOD / Admin / Principal.
   */
  sendNewLeaveNotification: async (receiverEmail, facultyName, department, designation, leaveType, fromDate, toDate, reason, substituteTeacher, leaveCode) => {
    console.log(`[EmailService] 📤 New-leave notification → ${receiverEmail}`);
    const subject = `[New Leave Request] Submitted by ${facultyName} — ${department}`;
    const html = getNewLeaveTemplate(facultyName, department, designation, leaveType, fromDate, toDate, reason, substituteTeacher, leaveCode);
    return sendNotificationEmail(receiverEmail, subject, html);
  },

  /**
   * Final outcome notification → sent to Faculty member.
   * Supports Approved / Rejected with full 3-stage approval flow summary.
   */
  sendFinalDecisionNotification: async (receiverEmail, facultyName, finalStatus, leaveType, fromDate, toDate, stage1, stage2, stage3, certificateNo) => {
    const isApproved = String(finalStatus || "").toUpperCase() === "APPROVED";
    console.log(`[EmailService] 📤 Final decision (${finalStatus}) → ${receiverEmail}`);

    const subject = isApproved
      ? `✅ [Leave Approved] Your ${leaveType} request has been approved`
      : `❌ [Leave Rejected] Your ${leaveType} request has been declined`;

    const html = isApproved
      ? getLeaveApprovedTemplate(facultyName, leaveType, fromDate, toDate, stage1, stage2, stage3, certificateNo)
      : getLeaveRejectedTemplate(facultyName, leaveType, fromDate, toDate, stage1, stage2, stage3);

    return sendNotificationEmail(receiverEmail, subject, html);
  },

  /**
   * Legacy compat: sendStatusUpdateNotification (kept for existing code)
   */
  sendStatusUpdateNotification: async (receiverEmail, status, approverRole, remarks, fromDate, toDate) => {
    const isApproved = String(status || "").toUpperCase() === "APPROVED";
    console.log(`[EmailService] 📤 Status update (${status}) → ${receiverEmail}`);
    const subject = `[Leave ${isApproved ? "Approved" : "Rejected"}] Your leave request status has been updated`;
    const fakeStage = { status: isApproved ? "approved" : "rejected", actorName: approverRole, remarks, actedOn: "" };
    const html = isApproved
      ? getLeaveApprovedTemplate("Faculty Member", "Leave", fromDate, toDate, null, null, fakeStage, "")
      : getLeaveRejectedTemplate("Faculty Member", "Leave", fromDate, toDate, null, null, fakeStage);
    return sendNotificationEmail(receiverEmail, subject, html);
  }
};
