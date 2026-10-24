import prisma from '../../config/db.js';
import {
  hashPassword,
  generateRandomToken,
  hashToken,
  normalizeEmail
} from '../../shared/security.js';
import { revokeAllUserSessions, getSafeUserProfile } from '../auth/auth.service.js';

const SETUP_TOKEN_EXPIRY_HOURS = parseInt(process.env.PASSWORD_SETUP_TOKEN_EXPIRES_HOURS || '24', 10);

/**
 * Create a single-use expiring password setup token for a user.
 */
export async function createPasswordSetupToken({ userType, userId, hoursValid = SETUP_TOKEN_EXPIRY_HOURS }) {
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);

  await prisma.passwordSetupToken.create({
    data: {
      userType,
      userId,
      tokenHash,
      expiresAt
    }
  });

  return {
    setupToken: rawToken,
    expiresAt
  };
}

/**
 * Establish a user's password using a valid setup token.
 */
export async function setupPasswordWithToken({ token, newPassword, password }) {
  const pwd = newPassword || password;
  if (!token || !pwd) {
    throw { status: 400, message: 'Setup token and new password are required.' };
  }

  if (typeof pwd !== 'string' || pwd.length < 8) {
    throw { status: 400, message: 'Password must be at least 8 characters long.' };
  }

  const tokenHash = hashToken(token.trim());

  const tokenRecord = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash }
  });

  if (!tokenRecord) {
    throw { status: 400, message: 'Invalid password setup token.' };
  }

  if (tokenRecord.usedAt) {
    throw { status: 400, message: 'This password setup token has already been used.' };
  }

  if (new Date(tokenRecord.expiresAt) <= new Date()) {
    throw { status: 400, message: 'This password setup token has expired. Please request a new setup link.' };
  }

  const { userType, userId } = tokenRecord;
  const newHash = await hashPassword(pwd);

  await prisma.$transaction(async (tx) => {
    // 1. Invalidate token
    await tx.passwordSetupToken.update({
      where: { tokenId: tokenRecord.tokenId },
      data: { usedAt: new Date() }
    });

    // 2. Update user's password and clear any failed attempts
    if (userType === 'ADMIN') {
      await tx.admin.update({
        where: { adminId: userId },
        data: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null }
      });
    } else if (userType === 'PARTNER') {
      await tx.company.update({
        where: { companyId: userId },
        data: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null }
      });
    } else if (userType === 'DRIVER') {
      await tx.driver.update({
        where: { driverId: userId },
        data: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null }
      });
    }

    // 3. Revoke all active sessions for security
    await tx.session.updateMany({
      where: { userType, userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });

  return {
    success: true,
    message: 'Password established successfully. You may now log in with your credentials.'
  };
}

/**
 * Public partner registration request.
 * Does NOT create an active company or grant immediate access.
 */
export async function submitPartnerRegistration({
  companyName,
  address,
  contactPerson,
  phoneNo,
  emailId,
  companyLocation,
  notes
}) {
  if (!companyName || !contactPerson || !phoneNo || !emailId) {
    throw { status: 400, message: 'Company name, contact person, phone number, and email are required.' };
  }

  const cleanEmail = normalizeEmail(emailId);

  // Check if an existing company already has this email
  const existingCompany = await prisma.company.findFirst({
    where: { emailId: { equals: cleanEmail, mode: 'insensitive' } }
  });
  if (existingCompany) {
    throw { status: 409, message: 'A company with this email address already exists.' };
  }

  // Check if a pending registration request already exists
  const existingPending = await prisma.companyRegistrationRequest.findFirst({
    where: {
      emailId: { equals: cleanEmail, mode: 'insensitive' },
      status: 'PENDING'
    }
  });
  if (existingPending) {
    throw { status: 409, message: 'A registration request for this email is already pending review.' };
  }

  const request = await prisma.companyRegistrationRequest.create({
    data: {
      companyName: companyName.trim(),
      address: address?.trim() || null,
      contactPerson: contactPerson.trim(),
      phoneNo: phoneNo.trim(),
      emailId: cleanEmail,
      companyLocation: companyLocation?.trim() || null,
      notes: notes?.trim() || null,
      status: 'PENDING'
    }
  });

  return {
    success: true,
    message: 'Partner registration request submitted successfully. Our team will review your application shortly.',
    requestId: request.requestId
  };
}

/**
 * Admin: List partner registration requests.
 */
export async function listPartnerRegistrationRequests(status) {
  const where = status ? { status: status.toUpperCase() } : {};
  return prisma.companyRegistrationRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedByAdmin: {
        select: { adminId: true, adminName: true, emailId: true }
      }
    }
  });
}

/**
 * Admin: Approve partner registration request and create company account.
 */
export async function approvePartnerRegistration({
  requestId,
  adminId,
  officeId,
  hiredSplit = 70.00,
  driverSplit = 30.00
}) {
  const request = await prisma.companyRegistrationRequest.findUnique({
    where: { requestId: parseInt(requestId, 10) }
  });

  if (!request) {
    throw { status: 404, message: 'Registration request not found.' };
  }

  if (request.status !== 'PENDING') {
    throw { status: 400, message: `Registration request is already ${request.status}.` };
  }

  // Verify office exists
  const office = await prisma.office.findUnique({ where: { officeId: parseInt(officeId, 10) } });
  if (!office) {
    throw { status: 400, message: 'Specified officeId does not exist.' };
  }

  const hSplit = Number(hiredSplit);
  const dSplit = Number(driverSplit);
  if (hSplit + dSplit !== 100) {
    throw { status: 400, message: 'hiredSplit and driverSplit must sum up to exactly 100.' };
  }

  // Unmatchable random hash placeholder until password is set via setup token
  const placeholderHash = `$2b$10$UNSET_${generateRandomToken(20)}`;

  let company, tokenData;

  await prisma.$transaction(async (tx) => {
    company = await tx.company.create({
      data: {
        name: request.companyName,
        address: request.address,
        contactPerson: request.contactPerson,
        phoneNo: request.phoneNo,
        emailId: request.emailId,
        passwordHash: placeholderHash,
        status: 'ACTIVE',
        officeId: office.officeId,
        companyLocation: request.companyLocation,
        hiredSplit: hSplit,
        driverSplit: dSplit
      }
    });

    await tx.companyRegistrationRequest.update({
      where: { requestId: request.requestId },
      data: {
        status: 'APPROVED',
        reviewedByAdminId: adminId,
        reviewedAt: new Date()
      }
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        userType: 'PARTNER',
        userId: company.companyId,
        tokenHash,
        expiresAt
      }
    });

    tokenData = { setupToken: rawToken, expiresAt };
  });

  return {
    company: getSafeUserProfile(company, 'PARTNER'),
    ...tokenData,
    message: 'Partner registration approved and company account created successfully.'
  };
}

/**
 * Admin: Reject partner registration request.
 */
export async function rejectPartnerRegistration({ requestId, adminId, reason }) {
  if (!reason || reason.trim() === '') {
    throw { status: 400, message: 'Rejection reason is required.' };
  }

  const request = await prisma.companyRegistrationRequest.findUnique({
    where: { requestId: parseInt(requestId, 10) }
  });

  if (!request) {
    throw { status: 404, message: 'Registration request not found.' };
  }

  if (request.status !== 'PENDING') {
    throw { status: 400, message: `Registration request is already ${request.status}.` };
  }

  const updated = await prisma.companyRegistrationRequest.update({
    where: { requestId: request.requestId },
    data: {
      status: 'REJECTED',
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason.trim()
    }
  });

  return {
    success: true,
    message: 'Registration request rejected.',
    request: updated
  };
}

/**
 * Admin: Create partner company directly.
 */
export async function createPartnerDirectly({
  name,
  address,
  contactPerson,
  phoneNo,
  emailId,
  officeId,
  companyLocation,
  hiredSplit = 70.00,
  driverSplit = 30.00
}) {
  if (!name || !emailId || !officeId) {
    throw { status: 400, message: 'Company name, emailId, and officeId are required.' };
  }

  const cleanEmail = normalizeEmail(emailId);
  const existing = await prisma.company.findFirst({
    where: { emailId: { equals: cleanEmail, mode: 'insensitive' } }
  });
  if (existing) {
    throw { status: 409, message: 'A company with this email address already exists.' };
  }

  const office = await prisma.office.findUnique({ where: { officeId: parseInt(officeId, 10) } });
  if (!office) {
    throw { status: 400, message: 'Specified officeId does not exist.' };
  }

  const hSplit = Number(hiredSplit);
  const dSplit = Number(driverSplit);
  if (hSplit + dSplit !== 100) {
    throw { status: 400, message: 'hiredSplit and driverSplit must sum up to exactly 100.' };
  }

  const placeholderHash = `$2b$10$UNSET_${generateRandomToken(20)}`;
  let company, tokenData;

  await prisma.$transaction(async (tx) => {
    company = await tx.company.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        phoneNo: phoneNo?.trim() || null,
        emailId: cleanEmail,
        passwordHash: placeholderHash,
        status: 'ACTIVE',
        officeId: office.officeId,
        companyLocation: companyLocation?.trim() || null,
        hiredSplit: hSplit,
        driverSplit: dSplit
      }
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        userType: 'PARTNER',
        userId: company.companyId,
        tokenHash,
        expiresAt
      }
    });

    tokenData = { setupToken: rawToken, expiresAt };
  });

  return {
    company: getSafeUserProfile(company, 'PARTNER'),
    ...tokenData,
    message: 'Partner company created. Secure password setup token generated.'
  };
}

/**
 * Admin: Create another Admin directly.
 */
export async function createAdminDirectly({
  adminName,
  emailId,
  phoneNo,
  officeId
}) {
  if (!adminName || !emailId || !officeId) {
    throw { status: 400, message: 'Admin name, emailId, and officeId are required.' };
  }

  const cleanEmail = normalizeEmail(emailId);
  const existing = await prisma.admin.findFirst({
    where: { emailId: { equals: cleanEmail, mode: 'insensitive' } }
  });
  if (existing) {
    throw { status: 409, message: 'An admin with this email address already exists.' };
  }

  const office = await prisma.office.findUnique({ where: { officeId: parseInt(officeId, 10) } });
  if (!office) {
    throw { status: 400, message: 'Specified officeId does not exist.' };
  }

  const placeholderHash = `$2b$10$UNSET_${generateRandomToken(20)}`;
  let admin, tokenData;

  await prisma.$transaction(async (tx) => {
    admin = await tx.admin.create({
      data: {
        adminName: adminName.trim(),
        emailId: cleanEmail,
        phoneNo: phoneNo?.trim() || null,
        officeId: office.officeId,
        passwordHash: placeholderHash,
        status: 'ACTIVE'
      }
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        userType: 'ADMIN',
        userId: admin.adminId,
        tokenHash,
        expiresAt
      }
    });

    tokenData = { setupToken: rawToken, expiresAt };
  });

  return {
    admin: getSafeUserProfile(admin, 'ADMIN'),
    ...tokenData,
    message: 'Admin account created. Secure password setup token generated.'
  };
}

/**
 * Admin: Create a Driver account (starts in PENDING status).
 */
export async function createDriverDirectly({
  name,
  phoneNo,
  currentLocation
}) {
  if (!name || !phoneNo) {
    throw { status: 400, message: 'Driver name and phone number are required.' };
  }

  const cleanPhone = phoneNo.trim();
  const existing = await prisma.driver.findUnique({
    where: { phoneNo: cleanPhone }
  });
  if (existing) {
    throw { status: 409, message: 'A driver with this phone number already exists.' };
  }

  const placeholderHash = `$2b$10$UNSET_${generateRandomToken(20)}`;

  const driver = await prisma.driver.create({
    data: {
      name: name.trim(),
      phoneNo: cleanPhone,
      currentLocation: currentLocation?.trim() || null,
      status: 'PENDING',
      passwordHash: placeholderHash,
      isOnline: false
    }
  });

  return {
    driver: getSafeUserProfile(driver, 'DRIVER'),
    message: 'Driver account created in PENDING status. Proceed to document verification before activation.'
  };
}

/**
 * Admin: Activate driver after document review and generate setup token.
 */
export async function activateDriver(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { driverId: parseInt(driverId, 10) }
  });

  if (!driver) {
    throw { status: 404, message: 'Driver not found.' };
  }

  let tokenData;

  await prisma.$transaction(async (tx) => {
    await tx.driver.update({
      where: { driverId: driver.driverId },
      data: { status: 'ACTIVE' }
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await tx.passwordSetupToken.create({
      data: {
        userType: 'DRIVER',
        userId: driver.driverId,
        tokenHash,
        expiresAt
      }
    });

    tokenData = { setupToken: rawToken, expiresAt };
  });

  const updatedDriver = await prisma.driver.findUnique({
    where: { driverId: driver.driverId }
  });

  return {
    driver: getSafeUserProfile(updatedDriver, 'DRIVER'),
    ...tokenData,
    message: 'Driver has been activated. Password setup token generated.'
  };
}
