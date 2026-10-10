import prisma from '../config/db.js';
import { verifyAccessToken } from '../shared/security.js';
import { getUserById, getSafeUserProfile } from '../modules/auth/auth.service.js';

/**
 * Authentication middleware: verifies access JWT and checks session and user active status.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Bearer token missing.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired access token.'
      });
    }

    const { userType, userId, sessionId } = decoded;

    // Verify session in database
    const session = await prisma.session.findUnique({
      where: { sessionId }
    });

    if (!session || session.revokedAt || new Date(session.expiresAt) <= new Date()) {
      return res.status(401).json({
        status: 'error',
        message: 'Session has expired or was revoked. Please log in again.'
      });
    }

    // Verify user account exists and is ACTIVE
    const user = await getUserById(userType, userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User account no longer exists.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        status: 'error',
        message: 'User account is inactive or disabled.'
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Attach verified user and session to request
    req.user = {
      userType,
      userId,
      sessionId,
      profile: getSafeUserProfile(user, userType)
    };

    next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Authentication verification failure.'
    });
  }
}

/**
 * Role authorization guard: restricts endpoint to specified userTypes.
 */
export function requireUserType(...allowedTypes) {
  return (req, res, next) => {
    if (!req.user || !allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Action requires one of: ${allowedTypes.join(', ')}`
      });
    }
    next();
  };
}

export const requireAdmin = requireUserType('ADMIN');
export const requirePartner = requireUserType('PARTNER');
export const requireDriver = requireUserType('DRIVER');
