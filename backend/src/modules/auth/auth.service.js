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
import { AppError } from '../../shared/response.js';

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
    throw new AppError(400, 'BAD_REQUEST', 'Identifier and password are required.');
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
    if (!user && !phone.startsWith('+')) {
      user = await prisma.driver.findUnique({
        where: { phoneNo: `+91${phone}` }
      });
    }
    if (!user && phone.startsWith('+91')) {
      user = await prisma.driver.findUnique({
        where: { phoneNo: phone.slice(3) }
      });
    }
    idField = 'driverId';
  } else {
    throw new AppError(400, 'BAD_REQUEST', 'Invalid identity type.');
  }

  // Generic message for security (prevents user enumeration)
  const genericAuthError = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');

  if (!user) {
    throw genericAuthError;
  }

  const userId = user[idField];

  // Check account lockout
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new AppError(
      403,
      'ACCOUNT_LOCKED',
      'Account is locked (5 failed logins, 15 minutes) or not active.'
    );
  }

  // Check account status
  if (userType === 'DRIVER') {
    if (user.status !== 'ACTIVE') {
      throw new AppError(
        403,
        'DRIVER_NOT_ACTIVE',
        'Driver account is not active or is pending onboarding verification.'
      );
    }
  } else {
    if (user.status !== 'ACTIVE') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Account is inactive. Please contact an administrator.'
      );
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
      throw new AppError(
        403,
        'ACCOUNT_LOCKED',
        'Account has been temporarily locked for 15 minutes due to multiple failed login attempts.'
      );
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

  const displayName = user.adminName || user.name || user.contactPerson || 'User';
  const safeProfile = getSafeUserProfile(user, userType);

  return {
    // OpenAPI standard properties
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 15 * 60, // 15 minutes
    user_type: userType,
    user: {
      user_id: userId,
      name: displayName,
      ...safeProfile,
      userType
    },
    // Backwards-compatible properties
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 15 * 60,
    userType,
    profile: safeProfile
  };
}

/**
 * Rotate refresh token safely, rejecting replayed or revoked tokens.
 */
export async function refreshUserSession(tokenString, ipAddress) {
  if (!tokenString) {
    throw new AppError(400, 'BAD_REQUEST', 'Refresh token is required.');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(tokenString);
  } catch (err) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is expired, revoked or the user is not active.');
  }

  const { sessionId, token: rawToken, userType, userId } = decoded;

  const session = await prisma.session.findUnique({
    where: { sessionId }
  });

  if (!session) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session not found.');
  }

  if (session.revokedAt) {
    // Replay attack detection: old token reused after revocation
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session has been revoked.');
  }

  if (new Date(session.expiresAt) <= new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session has expired.');
  }

  const expectedHash = hashToken(rawToken);
  if (session.refreshTokenHash !== expectedHash) {
    // Token mismatch / tampering
    await prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date() }
    });
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid session token.');
  }

  // Verify account is still active
  const activeUser = await getUserById(userType, userId);
  if (!activeUser || activeUser.status !== 'ACTIVE') {
    await prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date() }
    });
    throw new AppError(403, 'FORBIDDEN', 'User account is inactive.');
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
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: 15 * 60,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 15 * 60,
    user: getSafeUserProfile(activeUser, userType)
  };
}

/**
 * Revoke session on logout.
 * Can revoke by refresh token string or direct sessionId.
 */
export async function logoutUser(tokenString, sessionId = null) {
  if (sessionId) {
    await prisma.session.updateMany({
      where: { sessionId: Number(sessionId), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return;
  }

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
 * Revoke all active sessions for a specific user (e.g. on deactivation).
 */
export async function revokeAllUserSessions(userType, userId) {
  return prisma.session.updateMany({
    where: {
      userType,
      userId: Number(userId),
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
    return prisma.admin.findUnique({ where: { adminId: Number(userId) } });
  } else if (userType === 'PARTNER') {
    return prisma.company.findUnique({ where: { companyId: Number(userId) } });
  } else if (userType === 'DRIVER') {
    return prisma.driver.findUnique({ where: { driverId: Number(userId) } });
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
