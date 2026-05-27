/**
 * emailTemplates/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized HTML email templates for APCOER Faculty Leave Portal.
 *
 * Templates exported:
 *   templates.newLeaveApplication(data)  → Sent to HOD / Principal / Admin
 *   templates.leaveApproved(data)        → Sent to Faculty on APPROVED outcome
 *   templates.leaveRejected(data)        → Sent to Faculty on REJECTED outcome
 *
 * Shared design language: APCOER maroon (#8d2b2b) brand identity, Segoe UI
 * typography, premium glassmorphic cards, responsive 600px max-width layout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

/* ── Brand constants ─────────────────────────────────────────────────────────── */
const BRAND   = "#8d2b2b";
const ACCENT  = "#f47a2f";
const SUCCESS = "#2d7a50";
const DANGER  = "#b5323d";
const PORTAL_URL = process.env.PORTAL_URL || "http://localhost:3000";

/* ── Base wrapper (shared shell) ─────────────────────────────────────────────── */
function baseWrapper(headerBg, headerTitle, headerSubtitle, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f0ee;
      color: #3a231d;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { width: 100%; padding: 32px 16px; background-color: #f5f0ee; }
    .card {
      max-width: 620px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(83,31,25,0.10);
      border-top: 7px solid ${headerBg};
    }
    .header {
      background: linear-gradient(135deg, ${headerBg} 0%, rgba(0,0,0,0.15) 100%), ${headerBg};
      padding: 36px 32px 30px 32px;
      text-align: center;
      color: #fff;
    }
    .header-logo {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      width: 56px; height: 56px;
      line-height: 56px;
      font-size: 26px;
      margin-bottom: 14px;
      backdrop-filter: blur(4px);
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .header p { font-size: 13px; opacity: 0.88; }
    .body { padding: 36px 32px; line-height: 1.65; }
    .greeting { font-size: 16px; color: #6b4f47; margin-bottom: 18px; }
    .intro    { font-size: 14px; color: #7a5c54; margin-bottom: 24px; }
    .info-panel {
      background: #fdf7f5;
      border-left: 5px solid ${ACCENT};
      border-radius: 10px;
      padding: 22px 20px;
      margin-bottom: 28px;
    }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table tr td {
      padding: 9px 0;
      font-size: 13.5px;
      border-bottom: 1px solid rgba(141,43,43,0.07);
      vertical-align: top;
    }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table .lbl {
      font-weight: 700;
      color: #a07870;
      width: 36%;
      text-transform: uppercase;
      font-size: 11.5px;
      letter-spacing: 0.5px;
      padding-right: 12px;
    }
    .info-table .val { color: #2c1a14; font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 3px 11px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .badge-orange { background: #fdeee0; color: ${ACCENT}; }
    .badge-green  { background: #dff4ea; color: ${SUCCESS}; }
    .badge-red    { background: #fde8ea; color: ${DANGER};  }
    .badge-grey   { background: #efe9e7; color: #8d6a62;    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #b09090;
      letter-spacing: 0.7px;
      margin: 28px 0 12px 0;
      border-bottom: 1px solid rgba(141,43,43,0.08);
      padding-bottom: 7px;
    }
    .flow-table { width: 100%; border-collapse: collapse; }
    .flow-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #b09090;
      padding: 6px 0;
      border-bottom: 2px solid rgba(141,43,43,0.09);
      letter-spacing: 0.4px;
    }
    .flow-table th:nth-child(2) { text-align: center; width: 110px; }
    .flow-table th:last-child   { text-align: right; }
    .flow-table td {
      padding: 11px 0;
      font-size: 13px;
      border-bottom: 1px solid rgba(141,43,43,0.05);
      color: #3a231d;
    }
    .flow-table td:nth-child(2) { text-align: center; }
    .flow-table td:last-child   { text-align: right; font-style: italic; color: #7a5c54; font-size: 12px; }
    .status-hero {
      text-align: center;
      padding: 24px 20px;
      background: #fafaf9;
      border-radius: 12px;
      border: 1px solid rgba(141,43,43,0.08);
      margin-bottom: 24px;
    }
    .status-hero .big-badge {
      display: inline-block;
      padding: 10px 28px;
      border-radius: 40px;
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .btn-wrap { text-align: center; margin: 32px 0 8px 0; }
    .btn {
      display: inline-block;
      padding: 13px 32px;
      border-radius: 11px;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 16px rgba(141,43,43,0.18);
    }
    .footer {
      background: #fdfbfa;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #c0a099;
      border-top: 1px solid rgba(141,43,43,0.06);
      line-height: 1.7;
    }
    .ts { font-size: 11px; color: #cbb0ab; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">🎓</div>
        <h1>${headerTitle}</h1>
        <p>${headerSubtitle}</p>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        This is an automated message from the <strong>APCOER Faculty Leave Management Portal</strong>.<br>
        Please do not reply to this email directly.
        <div class="ts">Generated at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* ── Stage row helper (approval flow table) ──────────────────────────────────── */
function stageRow(roleName, stageData) {
  if (!stageData) return "";

  const s = String(stageData.status || "pending").toLowerCase();
  let badgeClass, statusLabel;

  switch (s) {
    case "approved": badgeClass = "badge-green";  statusLabel = "✓ Approved"; break;
    case "rejected": badgeClass = "badge-red";    statusLabel = "✗ Rejected"; break;
    case "skipped":  badgeClass = "badge-grey";   statusLabel = "⟶ Skipped";  break;
    default:         badgeClass = "badge-orange"; statusLabel = "⏳ Pending";  break;
  }

  const actor   = stageData.actorName ? ` <span style="font-size:11px;color:#b09090;">(${stageData.actorName})</span>` : "";
  const remarks = stageData.remarks   || "—";
  const date    = stageData.actedOn   || "";

  return `
    <tr>
      <td style="font-weight:600;color:#5a3d35;">${roleName}${actor}${date ? `<br><span style="font-size:11px;color:#c5a09a;font-weight:400;">${date}</span>` : ""}</td>
      <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      <td>${remarks}</td>
    </tr>`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE 1 — New Leave Application (sent to HOD / Principal / Admin)
   ══════════════════════════════════════════════════════════════════════════════
   Required data fields:
     facultyName, department, designation, leaveType,
     startDate, endDate, reason, substituteTeacher, leaveId, leaveCode
*/
function newLeaveApplication(data) {
  const {
    facultyName    = "Faculty Member",
    department     = "—",
    designation    = "—",
    leaveType      = "—",
    startDate      = "—",
    endDate        = "—",
    reason         = "—",
    substituteTeacher = "Not Specified",
    leaveId        = "",
    leaveCode      = ""
  } = data;

  const body = `
    <p class="greeting">Hello,</p>
    <p class="intro">
      A new leave application has been submitted through the APCOER Leave Portal and is <strong>awaiting your review</strong>.
      Please find the complete details below.
    </p>

    <div class="info-panel">
      <table class="info-table">
        <tr>
          <td class="lbl">Faculty Member</td>
          <td class="val"><strong>${facultyName}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Department</td>
          <td class="val">${department}</td>
        </tr>
        <tr>
          <td class="lbl">Designation</td>
          <td class="val">${designation}</td>
        </tr>
        <tr>
          <td class="lbl">Leave Type</td>
          <td class="val"><span class="badge badge-orange">${leaveType}</span></td>
        </tr>
        <tr>
          <td class="lbl">Period</td>
          <td class="val"><strong>${startDate}</strong> → <strong>${endDate}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Substitute</td>
          <td class="val">${substituteTeacher}</td>
        </tr>
        <tr>
          <td class="lbl">Reason</td>
          <td class="val"><em>${reason}</em></td>
        </tr>
        ${leaveCode ? `<tr><td class="lbl">Leave Code</td><td class="val" style="font-family:monospace;">${leaveCode}</td></tr>` : ""}
        ${leaveId   ? `<tr><td class="lbl">Leave ID</td><td class="val" style="font-family:monospace;font-size:12px;">${leaveId}</td></tr>` : ""}
      </table>
    </div>

    <p style="font-size:14px;color:#7a5c54;margin-bottom:28px;">
      Log in to the portal to <strong>approve</strong> or <strong>reject</strong> this request from your pending queue.
    </p>

    <div class="btn-wrap">
      <a href="${PORTAL_URL}" class="btn" style="background:${BRAND};color:#fff;">
        🔐 &nbsp;Review in Portal
      </a>
    </div>`;

  return baseWrapper(BRAND, "New Leave Application", "APCOER Faculty Leave Management System", body);
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE 2 — Leave APPROVED (sent to Faculty)
   ══════════════════════════════════════════════════════════════════════════════
   Required data fields:
     facultyName, leaveType, startDate, endDate, finalStatus,
     stage1 { status, actorName, actedOn, remarks },
     stage2 { status, actorName, actedOn, remarks },
     stage3 { status, actorName, actedOn, remarks },
     certificateNo (optional)
*/
function leaveApproved(data) {
  const {
    facultyName  = "Faculty Member",
    leaveType    = "Leave",
    startDate    = "—",
    endDate      = "—",
    stage1       = null,
    stage2       = null,
    stage3       = null,
    certificateNo = ""
  } = data;

  const body = `
    <p class="greeting">Dear <strong>${facultyName}</strong>,</p>
    <p class="intro">
      Congratulations! Your <strong>${leaveType}</strong> application for
      <strong>${startDate} to ${endDate}</strong> has been reviewed and finalized by all
      approval authorities. We are pleased to inform you of the following outcome:
    </p>

    <div class="status-hero">
      <div class="big-badge" style="background:#dff4ea;color:${SUCCESS};">
        ✅ &nbsp; APPROVED
      </div>
      ${certificateNo ? `<p style="margin-top:14px;font-size:13px;color:#7a5c54;">Certificate No: <strong style="font-family:monospace;">${certificateNo}</strong></p>` : ""}
    </div>

    <div class="section-title">Approval Flow Summary</div>
    <table class="flow-table">
      <thead>
        <tr>
          <th>Authority</th>
          <th>Decision</th>
          <th style="text-align:right;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${stageRow("HOD (Dept. Head)", stage1)}
        ${stageRow("Admin Office", stage2)}
        ${stageRow("Principal", stage3)}
      </tbody>
    </table>

    <p style="font-size:13px;color:#7a5c54;margin-top:28px;">
      Your leave record has been updated in the portal. You may view your full leave history and
      remaining balance in your dashboard.
    </p>

    <div class="btn-wrap">
      <a href="${PORTAL_URL}" class="btn" style="background:${SUCCESS};color:#fff;">
        📋 &nbsp;View Leave Records
      </a>
    </div>`;

  return baseWrapper(SUCCESS, "Leave Request Approved", "APCOER Faculty Leave Management System", body);
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE 3 — Leave REJECTED (sent to Faculty)
   ══════════════════════════════════════════════════════════════════════════════
   Same data shape as leaveApproved().
*/
function leaveRejected(data) {
  const {
    facultyName = "Faculty Member",
    leaveType   = "Leave",
    startDate   = "—",
    endDate     = "—",
    stage1      = null,
    stage2      = null,
    stage3      = null
  } = data;

  // Identify the rejecting authority for a personal message
  let rejectedBy = "an approval authority";
  for (const [label, stage] of [["HOD", stage1], ["Admin Office", stage2], ["Principal", stage3]]) {
    if (stage && stage.status === "rejected") {
      rejectedBy = stage.actorName ? `${label} (${stage.actorName})` : label;
      break;
    }
  }

  const body = `
    <p class="greeting">Dear <strong>${facultyName}</strong>,</p>
    <p class="intro">
      We regret to inform you that your <strong>${leaveType}</strong> application for
      <strong>${startDate} to ${endDate}</strong> has been <strong>declined</strong> by ${rejectedBy}.
      Please review the decision details below.
    </p>

    <div class="status-hero">
      <div class="big-badge" style="background:#fde8ea;color:${DANGER};">
        ❌ &nbsp; REJECTED
      </div>
    </div>

    <div class="section-title">Approval Flow Summary</div>
    <table class="flow-table">
      <thead>
        <tr>
          <th>Authority</th>
          <th>Decision</th>
          <th style="text-align:right;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${stageRow("HOD (Dept. Head)", stage1)}
        ${stageRow("Admin Office", stage2)}
        ${stageRow("Principal", stage3)}
      </tbody>
    </table>

    <p style="font-size:13px;color:#7a5c54;margin-top:28px;">
      If you believe this decision was made in error or wish to discuss it, please contact your
      department HOD or the Admin Office directly.
      You may also re-apply after addressing the concerns mentioned in the remarks above.
    </p>

    <div class="btn-wrap">
      <a href="${PORTAL_URL}" class="btn" style="background:${DANGER};color:#fff;">
        📋 &nbsp;View Leave History
      </a>
    </div>`;

  return baseWrapper(DANGER, "Leave Request Rejected", "APCOER Faculty Leave Management System", body);
}

/* ── Exports ──────────────────────────────────────────────────────────────────── */
module.exports = {
  templates: {
    newLeaveApplication,
    leaveApproved,
    leaveRejected
  }
};
