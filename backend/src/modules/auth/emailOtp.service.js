import dns from 'dns/promises';
import prisma from '../../config/db.js';
import {
  generateNumericOtp,
  hashToken,
  normalizeEmail,
  hashPassword,
  generateAccessToken,
  generateRefreshToken
} from '../../shared/security.js';
import { sendEmail } from '../../shared/mailer.js';

const OTP_VALID_MINUTES = 10;
const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;

const COMMON_DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com'
};

/**
 * Validate that an email domain is real, has MX records, and is not a common typo.
 */
export async function validateEmailDomain(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return;
  const domain = parts[1].toLowerCase().trim();

  // 1. Common typo suggestions
  if (COMMON_DOMAIN_TYPOS[domain]) {
    throw {
      status: 400,
      message: `Did you mean @${COMMON_DOMAIN_TYPOS[domain]}? Please check your email spelling.`
    };
  }

  // 2. Allow test domains during unit tests & development
  if (
    domain.endsWith('.example.com') ||
    domain === 'example.com' ||
    domain === 'test.com' ||
    domain === 'localhost' ||
    process.env.NODE_ENV === 'test'
  ) {
    return;
  }

  // 3. DNS MX record resolution (ensures domain exists and accepts emails)
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new Error('NO_MX');
    }
  } catch (dnsErr) {
    throw {
      status: 400,
      message: `Email domain "${domain}" not found or cannot receive mail. Please check for typos.`
    };
  }
}

/**
 * 1. Request an OTP (with 60s cooldown, 10-minute expiry, SHA-256 hash).
 */
export async function requestEmailOtp({ email, purpose }) {
  if (!email || typeof email !== 'string') {
    throw { status: 400, message: 'Please provide a valid email address.' };
  }

  const normEmail = normalizeEmail(email);
  if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    throw { status: 400, message: 'Please enter a valid email address format.' };
  }

  // Verify email domain existence & typos
  await validateEmailDomain(normEmail);

  const validPurposes = ['EMAIL_VERIFY', 'PASSWORD_RESET'];
  if (!purpose || !validPurposes.includes(purpose)) {
    throw { status: 400, message: 'Invalid OTP purpose specified.' };
  }


  // Pre-checks based on purpose
  if (purpose === 'EMAIL_VERIFY') {
    const existingCompany = await prisma.company.findUnique({
      where: { emailId: normEmail }
    });
    if (existingCompany) {
      throw {
        status: 409,
        message: 'An account with this email address already exists. Please sign in instead.'
      };
    }
  } else if (purpose === 'PASSWORD_RESET') {
    const existingCompany = await prisma.company.findUnique({
      where: { emailId: normEmail }
    });
    const existingAdmin = !existingCompany
      ? await prisma.admin.findUnique({ where: { emailId: normEmail } })
      : null;

    if (!existingCompany && !existingAdmin) {
      throw {
        status: 404,
        message: 'No active account was found with this email address. Please check and try again.'
      };
    }
  }

  // Security Pillar 5: Resend Cooldown (60 seconds) & Max 3 OTP Requests per 10-min window
  // Allows the user to retry if an email didn't arrive, with each new OTP valid for 10 minutes (last sent is valid).
  const mostRecentOtp = await prisma.emailOtp.findFirst({
    where: {
      email: normEmail,
      purpose
    },
    orderBy: { createdAt: 'desc' }
  });

  if (mostRecentOtp) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(mostRecentOtp.createdAt).getTime()) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const remainingSeconds = Math.max(1, COOLDOWN_SECONDS - elapsedSeconds);
      throw {
        status: 429,
        message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`
      };
    }
  }

  // Check how many OTP requests were made in the current 10-minute window (Max 3 attempts)
  const windowStart = new Date(Date.now() - OTP_VALID_MINUTES * 60 * 1000);
  const windowRequestsCount = await prisma.emailOtp.count({
    where: {
      email: normEmail,
      purpose,
      createdAt: { gte: windowStart }
    }
  });

  if (windowRequestsCount >= 3) {
    const oldestInWindow = await prisma.emailOtp.findFirst({
      where: {
        email: normEmail,
        purpose,
        createdAt: { gte: windowStart }
      },
      orderBy: { createdAt: 'asc' }
    });
    const windowRemainingSec = Math.max(
      1,
      Math.ceil((new Date(oldestInWindow.createdAt).getTime() + OTP_VALID_MINUTES * 60 * 1000 - Date.now()) / 1000)
    );
    throw {
      status: 429,
      message: `Please wait ${windowRemainingSec} seconds before requesting another code.`
    };
  }

  // Invalidate any previously pending unused OTPs for this email and purpose
  await prisma.emailOtp.updateMany({
    where: {
      email: normEmail,
      purpose,
      usedAt: null
    },
    data: {
      usedAt: new Date() // Invalidate previous unused codes
    }
  });

  // Generate 6-digit numeric OTP and SHA-256 hash (Security Pillars 4 & 5)
  const rawOtp = generateNumericOtp();
  const otpHash = hashToken(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000); // 10 minutes

  // Persist to database
  const createdRecord = await prisma.emailOtp.create({
    data: {
      email: normEmail,
      otpHash,
      purpose,
      attempts: 0,
      expiresAt
    }
  });

  // Construct Email Message
  const subject = purpose === 'EMAIL_VERIFY'
    ? 'HireD - Verify Your Email Address'
    : 'HireD - Password Reset Verification Code';

  const actionText = purpose === 'EMAIL_VERIFY'
    ? 'creating your HireD account'
    : 'resetting your HireD account password';

  const textBody = `Hello,

Your 6-digit verification code for ${actionText} is:

${rawOtp}

This code will expire in ${OTP_VALID_MINUTES} minutes.
For your security, never share this code with anyone.

If you did not request this code, you can safely ignore this email.

Best regards,
The HireD Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #6F2794; margin: 0; font-size: 24px;">HireD</h2>
        <p style="color: #71717a; margin-top: 4px; font-size: 14px;">Enterprise Driver & Trip Management</p>
      </div>
      <div style="background: #fbf8fd; border: 1px solid #e9d5ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">Your 6-digit verification code is:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #6F2794; padding: 8px 16px; background: #ffffff; border: 1px dashed #c084fc; border-radius: 6px; display: inline-block;">
          ${rawOtp}
        </div>
        <p style="color: #71717a; font-size: 13px; margin-top: 12px; margin-bottom: 0;">Expires in <strong>${OTP_VALID_MINUTES} minutes</strong>.</p>
      </div>
      <p style="color: #71717a; font-size: 13px; line-height: 1.5;">If you did not request this verification code, please ignore this email. Do not share this code with anyone.</p>
    </div>
  `;

  // Dispatch email delivery with fast response guarantee (never hangs the client)
  const emailPromise = sendEmail({
    to: normEmail,
    subject,
    text: textBody,
    html: htmlBody,
    entityType: 'OTP',
    entityId: createdRecord.otpId
  }).catch((err) => {
    console.error('[HireD Mailer] Background send error:', err?.message || err);
  });

  // Await up to 2.5s for fast SMTP delivery; if Gmail network latency exceeds 2.5s,
  // let it finish in background and respond immediately with HTTP 200
  await Promise.race([
    emailPromise,
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);

  return {
    success: true,
    message: 'Verification code has been sent to your email.',
    expiresInSeconds: OTP_VALID_MINUTES * 60
  };
}

/**
 * 2. Verify an OTP with strict attempt limits (Security Pillars 1 & 2).
 */
export async function verifyEmailOtp({ email, otp, purpose }) {
  if (!email || !otp || !purpose) {
    throw { status: 400, message: 'Email, verification code, and purpose are required.' };
  }

  const normEmail = normalizeEmail(email);
  const cleanOtp = String(otp).trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw { status: 400, message: 'Verification code must be exactly 6 digits.' };
  }

  // Find latest OTP matching (email, purpose)
  const otpRecord = await prisma.emailOtp.findFirst({
    where: {
      email: normEmail,
      purpose,
      usedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    throw {
      status: 400,
      message: 'No active verification code found for this email. Please request a new code.'
    };
  }

  // Pillar 3: Expiration check
  if (new Date(otpRecord.expiresAt) <= new Date()) {
    throw {
      status: 400,
      message: 'This verification code has expired. Please request a new code.'
    };
  }

  // Pillar 1: Brute-force defense (burn after 3 attempts)
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    // Burn the OTP
    await prisma.emailOtp.update({
      where: { otpId: otpRecord.otpId },
      data: { usedAt: new Date() }
    });
    throw {
      status: 400,
      message: 'Maximum attempts exceeded. This verification code has been deactivated for security. Please request a new code.'
    };
  }

  // Cryptographic check against SHA-256 hash
  const inputHash = hashToken(cleanOtp);
  if (inputHash !== otpRecord.otpHash) {
    const updatedAttempts = otpRecord.attempts + 1;
    await prisma.emailOtp.update({
      where: { otpId: otpRecord.otpId },
      data: {
        attempts: updatedAttempts,
        ...(updatedAttempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {})
      }
    });

    if (updatedAttempts >= MAX_ATTEMPTS) {
      throw {
        status: 400,
        message: 'Incorrect verification code. Maximum attempts exceeded. This code has been deactivated.'
      };
    }

    const remaining = MAX_ATTEMPTS - updatedAttempts;
    throw {
      status: 400,
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Success: mark used
  await prisma.emailOtp.update({
    where: { otpId: otpRecord.otpId },
    data: { usedAt: new Date() }
  });

  return { success: true };
}

/**
 * 3. Complete Company Registration after verifying OTP.
 */
export async function registerCompanyWithOtp({
  companyName,
  contactPerson,
  phoneNo,
  email,
  password,
  otp,
  ipAddress
}) {
  if (!companyName || !companyName.trim()) {
    throw { status: 400, message: 'Company name is required.' };
  }
  if (!contactPerson || !contactPerson.trim()) {
    throw { status: 400, message: 'Contact person name is required.' };
  }
  if (!phoneNo || !phoneNo.trim()) {
    throw { status: 400, message: 'Phone number is required.' };
  }
  if (!email || !email.trim()) {
    throw { status: 400, message: 'Email address is required.' };
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw { status: 400, message: 'Password must be at least 8 characters long.' };
  }
  if (!otp || !String(otp).trim()) {
    throw { status: 400, message: 'Verification code is required.' };
  }

  const normEmail = normalizeEmail(email);

  // 1. Verify OTP first
  await verifyEmailOtp({
    email: normEmail,
    otp,
    purpose: 'EMAIL_VERIFY'
  });

  // 2. Check if already exists in companies
  const existingCompany = await prisma.company.findUnique({
    where: { emailId: normEmail }
  });
  if (existingCompany) {
    throw { status: 409, message: 'An account with this email address already exists. Please sign in.' };
  }

  // 3. Hash password
  const passwordHash = await hashPassword(password);

  // 4. Determine office ID (defaults to primary office)
  let officeId = 1;
  const defaultOffice = await prisma.office.findFirst();
  if (defaultOffice) {
    officeId = defaultOffice.officeId;
  }

  // 5. Create Company in database
  const newCompany = await prisma.company.create({
    data: {
      name: companyName.trim(),
      contactPerson: contactPerson.trim(),
      phoneNo: phoneNo.trim(),
      emailId: normEmail,
      passwordHash,
      status: 'ACTIVE',
      officeId,
      hiredSplit: 30.0,
      driverSplit: 70.0
    }
  });

  // 5. Create initial session for immediate login
  const rawRefreshToken = generateAccessToken({
    userType: 'PARTNER',
    userId: newCompany.companyId,
    rand: Date.now()
  });
  const refreshTokenHash = hashToken(rawRefreshToken);
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userType: 'PARTNER',
      userId: newCompany.companyId,
      refreshTokenHash,
      expiresAt: sessionExpiresAt,
      ipAddress: ipAddress || null
    }
  });

  const accessToken = generateAccessToken({
    userType: 'PARTNER',
    userId: newCompany.companyId,
    sessionId: session.sessionId
  });

  const refreshToken = generateRefreshToken({
    userType: 'PARTNER',
    userId: newCompany.companyId,
    sessionId: session.sessionId
  });

  const userProfile = {
    companyId: newCompany.companyId,
    company_id: newCompany.companyId,
    name: newCompany.name,
    contactPerson: newCompany.contactPerson,
    phoneNo: newCompany.phoneNo,
    emailId: newCompany.emailId,
    status: newCompany.status,
    user_type: 'PARTNER'
  };

  return {
    success: true,
    message: 'Account created successfully! Welcome to HireD.',
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 900,
    user_type: 'PARTNER',
    user: userProfile,
    company: userProfile
  };
}

/**
 * 4. Reset Password using OTP.
 */
export async function resetPasswordWithOtp({ email, otp, newPassword }) {
  if (!email || !otp || !newPassword) {
    throw { status: 400, message: 'Email, verification code, and new password are required.' };
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw { status: 400, message: 'New password must be at least 8 characters long.' };
  }

  const normEmail = normalizeEmail(email);

  // 1. Verify OTP first
  await verifyEmailOtp({
    email: normEmail,
    otp,
    purpose: 'PASSWORD_RESET'
  });

  // 2. Locate account
  const company = await prisma.company.findUnique({
    where: { emailId: normEmail }
  });
  const admin = !company
    ? await prisma.admin.findUnique({ where: { emailId: normEmail } })
    : null;

  if (!company && !admin) {
    throw { status: 404, message: 'No account found for this email address.' };
  }

  const newHash = await hashPassword(newPassword);

  if (company) {
    await prisma.$transaction([
      prisma.company.update({
        where: { companyId: company.companyId },
        data: {
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      // Revoke all active sessions for security
      prisma.session.updateMany({
        where: { userType: 'PARTNER', userId: company.companyId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
  } else if (admin) {
    await prisma.$transaction([
      prisma.admin.update({
        where: { adminId: admin.adminId },
        data: {
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      prisma.session.updateMany({
        where: { userType: 'ADMIN', userId: admin.adminId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
  }

  return {
    success: true,
    message: 'Your password has been reset successfully. You may now log in with your new credentials.'
  };
}
