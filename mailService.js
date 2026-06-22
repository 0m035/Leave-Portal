/**
 * mailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Gmail SMTP email service for APCOER Faculty Leave Portal.
 * Uses Nodemailer with STARTTLS (port 587) and Gmail App Password authentication.
 *
 * Environment Variables (configure in .env):
 *   MAIL_HOST     = smtp.gmail.com
 *   MAIL_PORT     = 587
 *   MAIL_USER     = yourgmail@gmail.com
 *   MAIL_PASSWORD = your_16_char_app_password
 *   MAIL_FROM     = yourgmail@gmail.com
 *
 * Usage:
 *   const mailService = require('./mailService');
 *   await mailService.sendMail({ to, subject, html });
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const nodemailer = require("nodemailer");
const crypto     = require("crypto");

/* ── Lazy singleton transporter ────────────────────────────────────────────── */

let _transporter = null;

/**
 * Returns a cached Nodemailer transporter.
 * Falls back to a safe console-mock when SMTP credentials are absent.
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const host  = (process.env.MAIL_HOST     || process.env.SMTP_HOST     || "").trim();
  const port  = (process.env.MAIL_PORT     || process.env.SMTP_PORT     || "587").trim();
  const user  = (process.env.MAIL_USER     || process.env.SMTP_USER     || "").trim();
  // Trim whitespace — Render dashboard may add accidental leading/trailing spaces
  const pass  = (process.env.MAIL_PASSWORD || process.env.SMTP_PASS     || "").trim();
  const from  = (process.env.MAIL_FROM     || process.env.SMTP_FROM     || "no-reply@apcoer.edu.in").trim();

  // ── Startup diagnostics (visible in Render logs) ────────────────────────────
  console.log("[MailService] 🔍 SMTP Configuration Check:");
  console.log(`  MAIL_HOST     : ${host     || "❌ NOT SET"}`);
  console.log(`  MAIL_PORT     : ${port     || "❌ NOT SET"}`);
  console.log(`  MAIL_USER     : ${user     || "❌ NOT SET"}`);
  console.log(`  MAIL_PASSWORD : ${pass     ? `✅ SET (${pass.length} chars)` : "❌ NOT SET"}`);
  console.log(`  MAIL_FROM     : ${from     || "❌ NOT SET"}`);
  console.log(`  PORTAL_URL    : ${process.env.PORTAL_URL || "⚠️  not set — email links will use localhost:3000"}`);

  const isReady = Boolean(host && user && pass);

  if (isReady) {
    _transporter = nodemailer.createTransport({
      host,
      port:   parseInt(port, 10),
      secure: port === "465",   // true for SSL/465, false for STARTTLS/587
      auth:   { user, pass },
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2"
      }
    });

    console.log(`[MailService] ✅ Gmail SMTP transporter ready → ${host}:${port} (from: ${from})`);
  } else {
    // Fallback mock — prints mail content to console instead of sending
    const missing = [
      !host ? "MAIL_HOST" : null,
      !user ? "MAIL_USER" : null,
      !pass ? "MAIL_PASSWORD" : null
    ].filter(Boolean).join(", ");

    _transporter = {
      sendMail: async (opts) => {
        const msgId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        console.log("\n╔══════════════════════════════════════════════════════╗");
        console.log("║         📬  [MAIL SERVICE — MOCK MODE]               ║");
        console.log("╚══════════════════════════════════════════════════════╝");
        console.log(`  TO      : ${opts.to}`);
        console.log(`  FROM    : ${opts.from || from}`);
        console.log(`  SUBJECT : ${opts.subject}`);
        console.log("  ─────────────────────────────────────────────────────");
        console.log("  [HTML body omitted — configure SMTP env vars to send real emails]");
        console.log("╚══════════════════════════════════════════════════════╝\n");
        return { messageId: msgId, response: "250 Mock OK" };
      }
    };

    console.warn(
      `[MailService] ⚠️  RUNNING IN MOCK MODE — Missing env vars: ${missing}. ` +
      "Set these in your Render dashboard (Environment tab) to enable real email delivery."
    );
  }

  return _transporter;
}

/* ── Core sendMail() function ───────────────────────────────────────────────── */

/**
 * Sends an email with automatic retry (exponential backoff, max 3 attempts).
 *
 * @param {object}  options
 * @param {string}  options.to        - Recipient email address
 * @param {string}  options.subject   - Email subject line
 * @param {string}  options.html      - HTML body content
 * @param {string}  [options.from]    - Override sender (defaults to MAIL_FROM env var)
 * @param {number}  [_attempt=0]      - Internal retry counter (do not pass manually)
 * @returns {Promise<{success: boolean, messageId: string|null, error: string|null}>}
 */
async function sendMail(options, _attempt = 0) {
  const MAX_ATTEMPTS = 3;
  const { to, subject, html, from } = options;
  const sender = from || process.env.MAIL_FROM || process.env.SMTP_FROM || "no-reply@apcoer.edu.in";
  const traceId = crypto.randomBytes(4).toString("hex").toUpperCase();

  console.log(`[MailService][${traceId}] 📨 Sending to <${to}> | Attempt ${_attempt + 1}/${MAX_ATTEMPTS} | Subject: "${subject}"`);

  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: sender,
      to,
      subject,
      html
    });

    console.log(`[MailService][${traceId}] ✅ Delivered → MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, error: null };

  } catch (err) {
    console.error(`[MailService][${traceId}] ❌ Delivery failed (attempt ${_attempt + 1}): ${err.message}`);

    if (_attempt < MAX_ATTEMPTS - 1) {
      // Exponential backoff: 5s → 15s → 45s
      const delayMs = Math.pow(3, _attempt) * 5000;
      console.log(`[MailService][${traceId}] 🔁 Scheduling retry in ${delayMs / 1000}s...`);

      setTimeout(() => {
        sendMail(options, _attempt + 1).catch(() => {});
      }, delayMs);
    } else {
      console.error(`[MailService][${traceId}] 🚫 Hard failure — max retries exhausted for <${to}>.`);
    }

    return { success: false, messageId: null, error: err.message };
  }
}

/* ── Convenience wrappers ───────────────────────────────────────────────────── */

/**
 * Sends the "New Leave Application" notification to HOD / Principal / Admin.
 *
 * @param {string} recipientEmail - Recipient's email address
 * @param {object} data           - Leave application data
 */
async function sendNewLeaveApplicationMail(recipientEmail, data) {
  const { templates } = require("./emailTemplates");
  const html = templates.newLeaveApplication(data);
  return sendMail({
    to:      recipientEmail,
    subject: `[New Leave Request] Submitted by ${data.facultyName} — ${data.department}`,
    html
  });
}

/**
 * Sends the final "Leave Approved" or "Leave Rejected" notification to the Faculty member.
 *
 * @param {string} facultyEmail - Faculty's email address
 * @param {object} data         - Leave decision data with stage details
 */
async function sendFinalDecisionMail(facultyEmail, data) {
  const { templates } = require("./emailTemplates");
  const isApproved = String(data.finalStatus || "").toUpperCase() === "APPROVED";
  const html = isApproved
    ? templates.leaveApproved(data)
    : templates.leaveRejected(data);

  return sendMail({
    to:      facultyEmail,
    subject: isApproved
      ? `✅ Leave Approved — Your ${data.leaveType} Request Has Been Approved`
      : `❌ Leave Rejected — Your ${data.leaveType} Request Has Been Declined`,
    html
  });
}

/* ── Module Exports ─────────────────────────────────────────────────────────── */

module.exports = {
  sendMail,
  sendNewLeaveApplicationMail,
  sendFinalDecisionMail,
  getTransporter
};
