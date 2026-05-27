/**
 * test-mail.js — Quick Gmail SMTP connection test
 * Run: node test-mail.js
 */

const path = require("path");
const fs   = require("fs");

// Load .env manually (same way server.js does it)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  });
}

const nodemailer = require("nodemailer");

const host = process.env.MAIL_HOST     || process.env.SMTP_HOST;
const port = process.env.MAIL_PORT     || process.env.SMTP_PORT || "587";
const user = process.env.MAIL_USER     || process.env.SMTP_USER;
const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
const from = process.env.MAIL_FROM     || process.env.SMTP_FROM || user;

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║        📬  APCOER Leave Portal — SMTP Test               ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

console.log("📋 Configuration loaded:");
console.log(`   MAIL_HOST     : ${host      || "❌ NOT SET"}`);
console.log(`   MAIL_PORT     : ${port}`);
console.log(`   MAIL_USER     : ${user      || "❌ NOT SET"}`);
console.log(`   MAIL_PASSWORD : ${pass      ? "✅ SET (" + pass.length + " chars)" : "❌ NOT SET"}`);
console.log(`   MAIL_FROM     : ${from      || "❌ NOT SET"}`);

if (!host || !user || !pass) {
  console.log("\n❌ SMTP credentials are missing in your .env file.");
  console.log("   Please fill in MAIL_HOST, MAIL_USER, and MAIL_PASSWORD.\n");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port: parseInt(port, 10),
  secure: port === "465",
  auth: { user, pass },
  tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" }
});

async function runTest() {
  // Step 1: Verify SMTP connection
  console.log("\n🔌 Step 1: Verifying SMTP connection to Gmail...");
  try {
    await transporter.verify();
    console.log("   ✅ SMTP connection successful! Gmail accepted the credentials.\n");
  } catch (err) {
    console.log(`   ❌ SMTP connection FAILED: ${err.message}\n`);
    console.log("   Common fixes:");
    console.log("   • Make sure MAIL_PASSWORD is a Gmail App Password (not your login password)");
    console.log("   • Make sure 2-Step Verification is enabled on your Google Account");
    console.log("   • Visit: https://myaccount.google.com/apppasswords\n");
    process.exit(1);
  }

  // Step 2: Send a real test email to yourself
  console.log(`📨 Step 2: Sending a test email to <${user}>...`);
  try {
    const info = await transporter.sendMail({
      from: `"APCOER Leave Portal" <${from}>`,
      to:   user,          // sends to yourself so you can verify it arrives
      subject: "✅ APCOER Leave Portal — SMTP Test Successful",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Segoe UI,sans-serif;background:#f5f0ee;padding:30px;">
          <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;
                      overflow:hidden;border-top:6px solid #8d2b2b;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
            <div style="background:#8d2b2b;padding:28px;text-align:center;color:#fff;">
              <div style="font-size:36px;margin-bottom:8px;">✅</div>
              <h1 style="margin:0;font-size:20px;font-weight:700;">SMTP Test Successful!</h1>
              <p style="margin:8px 0 0;opacity:.88;font-size:13px;">APCOER Faculty Leave Management Portal</p>
            </div>
            <div style="padding:30px;">
              <p style="color:#6b4f47;font-size:15px;margin-bottom:16px;">
                🎉 Congratulations! Your Gmail SMTP configuration is working correctly.
              </p>
              <div style="background:#fdf7f5;border-left:4px solid #f47a2f;border-radius:8px;padding:16px;margin-bottom:20px;">
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                  <tr><td style="color:#a07870;font-weight:700;padding:6px 0;width:40%;">SMTP HOST</td><td style="color:#2c1a14;">${host}</td></tr>
                  <tr><td style="color:#a07870;font-weight:700;padding:6px 0;">SMTP PORT</td><td style="color:#2c1a14;">${port} (STARTTLS)</td></tr>
                  <tr><td style="color:#a07870;font-weight:700;padding:6px 0;">SENDER</td><td style="color:#2c1a14;">${user}</td></tr>
                  <tr><td style="color:#a07870;font-weight:700;padding:6px 0;">TESTED AT</td><td style="color:#2c1a14;">${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</td></tr>
                </table>
              </div>
              <p style="color:#7a5c54;font-size:13px;">
                Faculty members will now receive leave approval/rejection emails automatically.
                HOD, Admin, and Principal will be notified when new leave requests are submitted.
              </p>
            </div>
            <div style="background:#fdfbfa;padding:16px;text-align:center;font-size:12px;color:#c0a099;border-top:1px solid #f0e8e5;">
              This is an automated test from the APCOER Leave Portal.
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log(`   ✅ Test email sent! Message ID: ${info.messageId}`);
    console.log(`\n📥 Check your inbox at: ${user}`);
    console.log("   (Also check your Spam/Junk folder if you don't see it)\n");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  🎉  ALL TESTS PASSED — Gmail SMTP is fully working!     ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

  } catch (err) {
    console.log(`   ❌ Email send FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

runTest();
