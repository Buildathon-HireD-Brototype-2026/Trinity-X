import prisma from '../../config/db.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  normalizeEmail
} from '../../shared/security.js';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function formatInet(ip) {
  if (!ip) return null;
  let clean = ip.trim();
  if (clean === '::1') return '127.0.0.1';
  if (clean.startsWith('::ffff:')) {
    clean = clean.replace('::ffff:', '');
  }
  const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clean);
  const isIPv6 = clean.includes(':');
  return (isIPv4 || isIPv6) ? clean : null;
}

/**
 * Shared login logic for ADMIN, PARTNER, and DRIVER.
 */
export async function loginUser({ identityType, identifier, password, ipAddress }) {
  if (!identifier || !password) {
    throw { status: 400, message: 'Identifier and password are required.' };
  }

  let user = null;
  let userType = identityType.toUpperCase(); // 'ADMIN', 'PARTNER', 'DRIVER'
  let idField = '';

  if (userType === 'ADMIN') {
    const email = normalizeEmail(identifier);
    user = await prisma.admin.findFirst({
      where: { emailId: { equals: email, mode: 'insensitive' } }
    });
    idField = 'adminId';
  } else if (userType === 'PARTNER') {
    const email = normalizeEmail(identifier);
    user = await prisma.company.findFirst({
      where: { emailId: { equals: email, mode: 'insensitive' } }
    });
    idField = 'companyId';
  } else if (userType === 'DRIVER') {
    const phone = identifier.trim();
    user = await prisma.driver.findUnique({
      where: { phoneNo: phone }
    });
    idField = 'driverId';
  } else {
    throw { status: 400, message: 'Invalid identity type.' };
  }

  // Generic message for security (prevents user enumeration)
  const genericAuthError = { status: 401, message: 'Invalid credentials.' };

  if (!user) {
    throw genericAuthError;
  }

  const userId = user[idField];

  // Check account lockout
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw {
      status: 403,
      message: 'Account is temporarily locked due to consecutive failed attempts. Please try again later.'
    };
  }

  // Check account status
  if (userType === 'DRIVER') {
    if (user.status !== 'ACTIVE') {
      throw {
        status: 403,
        message: 'Driver account is not active or is pending onboarding verification.'
      };
    }
  } else {
    if (user.status !== 'ACTIVE') {
      throw {
        status: 403,
        message: 'Account is inactive. Please contact an administrator.'
      };
    }
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= LOCKOUT_THRESHOLD;
    const updateData = {
      failedLoginAttempts: attempts,
      ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) } : {})
    };

    if (userType === 'ADMIN') {
      await prisma.admin.update({ where: { adminId: userId }, data: updateData });
    } else if (userType === 'PARTNER') {
      await prisma.company.update({ where: { companyId: userId }, data: updateData });
    } else if (userType === 'DRIVER') {
      await prisma.driver.update({ where: { driverId: userId }, data: updateData });
    }

    if (shouldLock) {
      throw {
        status: 403,
        message: 'Account has been temporarily locked for 15 minutes due to multiple failed login attempts.'
      };
    }

    throw genericAuthError;
  }

  // Reset failed attempts upon successful authentication
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    const resetData = { failedLoginAttempts: 0, lockedUntil: null };
    if (userType === 'ADMIN') {
      await prisma.admin.update({ where: { adminId: userId }, data: resetData });
    } else if (userType === 'PARTNER') {
      await prisma.company.update({ where: { companyId: userId }, data: resetData });
    } else if (userType === 'DRIVER') {
      await prisma.driver.update({ where: { driverId: userId }, data: resetData });
    }
  }

  // Create session and issue tokens
  const rawToken = generateRandomToken(40);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  const session = await prisma.session.create({
    data: {
      userType,
      userId,
      refreshTokenHash: tokenHash,
      expiresAt,
      ipAddress: formatInet(ipAddress)
    }
  });

  const tokenPayload = {
    userType,
    userId,
    sessionId: session.sessionId
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({
    ...tokenPayload,
    token: rawToken
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    user: getSafeUserProfile(user, userType)
  };
}

/**
 * Rotate refresh token safely, rejecting replayed or revoked tokens.
 */
export async function refreshUserSession(tokenString, ipAddress) {
  if (!tokenString) {
    throw { status: 401, message: 'Refresh token is required.' };
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(tokenString);
  } catch (err) {
    throw { status: 401, message: 'Invalid or expired refresh token.' };
  }

  const { sessionId, token: rawToken, userType, userId } = decoded;

  const session = await prisma.session.findUnique({
    where: { sessionId }
  });

  if (!session) {
    throw { status: 401, message: 'Session not found.' };
  }

  if (session.revokedAt) {
    // Replay attack detection: old token reused after revocation
    throw { status: 401, message: 'Session has been revoked.' };
  }

  if (new Date(session.expiresAt) <= new Date()) {
    throw { status: 401, message: 'Session has expired.' };
  }

  const expectedHash = hashToken(rawToken);
  if (session.refreshTokenHash !== expectedHash) {
    // Token mismatch / tampering
    await prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date() }
    });
    throw { status: 401, message: 'Invalid session token.' };
  }

  // Verify account is still active
  const activeUser = await getUserById(userType, userId);
  if (!activeUser || activeUser.status !== 'ACTIVE') {
    await prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date() }
    });
    throw { status: 403, message: 'User account is inactive.' };
  }

  // Rotate in a transaction: revoke old session, create new session
  const newRawToken = generateRandomToken(40);
  const newTokenHash = hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  const [_, newSession] = await prisma.$transaction([
    prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date() }
    }),
    prisma.session.create({
      data: {
        userType,
        userId,
        refreshTokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        ipAddress: formatInet(ipAddress)
      }
    })
  ]);

  const tokenPayload = {
    userType,
    userId,
    sessionId: newSession.sessionId
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken({
    ...tokenPayload,
    token: newRawToken
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60,
    user: getSafeUserProfile(activeUser, userType)
  };
}

/**
 * Revoke session on logout.
 */
export async function logoutUser(tokenString) {
  if (!tokenString) return;

  try {
    const decoded = verifyRefreshToken(tokenString);
    if (decoded?.sessionId) {
      await prisma.session.updateMany({
        where: { sessionId: decoded.sessionId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
  } catch (err) {
    // If token already expired or invalid, nothing to revoke
  }
}

/**
 * Revoke all active sessions for a specific user (e.g. on deactivation or password reset).
 */
export async function revokeAllUserSessions(userType, userId) {
  return prisma.session.updateMany({
    where: {
      userType,
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

/**
 * Look up user entity by userType and userId.
 */
export async function getUserById(userType, userId) {
  if (userType === 'ADMIN') {
    return prisma.admin.findUnique({ where: { adminId: userId } });
  } else if (userType === 'PARTNER') {
    return prisma.company.findUnique({ where: { companyId: userId } });
  } else if (userType === 'DRIVER') {
    return prisma.driver.findUnique({ where: { driverId: userId } });
  }
  return null;
}

/**
 * Return safe profile object removing sensitive credentials.
 */
export function getSafeUserProfile(user, userType) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return {
    ...safe,
    userType
  };
}
