import nodemailer from 'nodemailer';
import prisma from '../config/db.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const rawUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (rawUser && rawPass) {
    const user = rawUser.trim();
    const pass = rawPass.replace(/\s+/g, ''); // Removes spaces if copied as "abcd efgh ijkl mnop"

    if (user.includes('gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SMTP_PORT || '465', 10);
      const secure = port === 465;

      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
      });
    }
  }

  return transporter;
}


/**
 * Send an email notification or OTP.
 * If SMTP credentials are configured, sends the email.
 * Always prints to developer console and logs to database notifications table.
 */
export async function sendEmail({ to, subject, text, html, entityType = 'AUTH', entityId = 0 }) {
  const from = process.env.SMTP_FROM || 'HireD Support <support@hiredassist.in>';
  const mailTransporter = getTransporter();

  // Print prominent developer log
  console.log(`\n============================================================`);
  console.log(`[HireD Mailer] 📧 Sending Email to: ${to}`);
  console.log(`[HireD Mailer] Subject: ${subject}`);
  console.log(`[HireD Mailer] Message:\n${text}`);
  console.log(`============================================================\n`);

  let status = 'PENDING';
  let lastError = null;
  let sentAt = null;

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text
      });
      status = 'SENT';
      sentAt = new Date();
      console.log(`[HireD Mailer] ✅ Email delivered successfully to ${to}`);
    } catch (err) {
      status = 'FAILED';
      lastError = err.message || 'SMTP delivery failed';
      console.error(`[HireD Mailer] ❌ SMTP Error:`, err.message);
    }
  } else {
    // Development mode fallback
    status = 'SENT';
    sentAt = new Date();
    console.log(`[HireD Mailer] ℹ️ SMTP not configured. Outputting code to console & notifications table.`);
  }

  // Audit trail in notifications table (non-blocking)
  try {
    await prisma.notification.create({
      data: {
        recipientType: 'PARTNER',
        recipientId: entityId,
        recipientEmail: to,
        type: 'STATEMENT_PUBLISHED',
        entityType,
        entityId,
        status: status === 'SENT' ? 'SENT' : 'PENDING',
        lastError,
        sentAt
      }
    });
  } catch (auditErr) {
    // Non-blocking notification logging
  }

  return { success: status === 'SENT', status };
}
