/**
 * config/smtp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gmail SMTP transporter configuration using Nodemailer.
 * Uses STARTTLS on port 587 with Gmail App Password authentication.
 *
 * Environment variables (set in .env):
 *   MAIL_HOST     = smtp.gmail.com       (or SMTP_HOST for legacy compat)
 *   MAIL_PORT     = 587
 *   MAIL_USER     = yourgmail@gmail.com  (or SMTP_USER)
 *   MAIL_PASSWORD = your_app_password    (or SMTP_PASS)
 *   MAIL_FROM     = yourgmail@gmail.com  (or SMTP_FROM)
 *
 * Gracefully falls back to a console-mock transporter when credentials are absent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const nodemailer = require("nodemailer");
require("dotenv").config();

const host = process.env.MAIL_HOST     || process.env.SMTP_HOST;
const port = process.env.MAIL_PORT     || process.env.SMTP_PORT     || "587";
const user = process.env.MAIL_USER     || process.env.SMTP_USER;
const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
const from = process.env.MAIL_FROM     || process.env.SMTP_FROM     || "no-reply@apcoer.edu.in";

const isSmtpConfigured = Boolean(host && user && pass);

let transporter;

if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === "465",   // true for SSL, false for STARTTLS (587)
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    }
  });

  console.log(`[SMTP] ✅ Gmail transporter ready → ${host}:${port} (user: ${user})`);
} else {
  // Development fallback: prints mail content to console, sends nothing
  transporter = {
    sendMail: async (opts) => {
      const msgId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║      📬  [SMTP — CONSOLE MOCK MODE]                  ║");
      console.log("╚══════════════════════════════════════════════════════╝");
      console.log(`  TO      : ${opts.to}`);
      console.log(`  FROM    : ${opts.from || from}`);
      console.log(`  SUBJECT : ${opts.subject}`);
      console.log("  NOTE    : Set MAIL_USER / MAIL_PASSWORD to send real emails.");
      console.log("╚══════════════════════════════════════════════════════╝\n");
      return { messageId: msgId, response: "250 Mock OK" };
    }
  };

  console.warn(
    "[SMTP] ⚠️  MAIL_USER / MAIL_PASSWORD / MAIL_HOST not set. " +
    "Running in CONSOLE MOCK mode — no emails will be sent."
  );
}

module.exports = { transporter, fromEmail: from };
