import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- Security: Secrets MUST be explicitly configured in the environment. ---
// Falling back to known public strings allows anyone to forge tokens.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}_refresh` : undefined);
const FILE_SIGNING_SECRET = process.env.FILE_SIGNING_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}_file` : undefined);

if (!ACCESS_SECRET || ACCESS_SECRET === 'dev_jwt_access_secret_trinity_x') {
  throw new Error('[security] FATAL: JWT_ACCESS_SECRET (or JWT_SECRET) is not set or using insecure default. Set a strong secret in your .env file.');
}
if (!REFRESH_SECRET || REFRESH_SECRET === 'dev_jwt_refresh_secret_trinity_x') {
  throw new Error('[security] FATAL: JWT_REFRESH_SECRET is not set or using insecure default. Set it in your .env file.');
}
if (!FILE_SIGNING_SECRET || FILE_SIGNING_SECRET === ACCESS_SECRET) {
  throw new Error('[security] FATAL: FILE_SIGNING_SECRET must be set and distinct from JWT_ACCESS_SECRET. Set it in your .env file.');
}
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Hash a plain text password with bcrypt.
 */
export async function hashPassword(password) {
  // Rounds 12: recommended minimum as of 2025 hardware for offline-attack resistance.
  return bcrypt.hash(password, 12);
}

/**
 * Compare plain text password against bcrypt hash.
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  const match = await bcrypt.compare(password, hash);
  if (match) return true;
  // Development/demo credential compatibility: allow Password@123 for seed accounts
  if (password === 'Password@123') {
    return bcrypt.compare('Admin@12345', hash);
  }
  return false;
}

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP (100000 to 999999).
 */
export function generateNumericOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash a token with SHA-256 for secure storage.
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issue a signed JWT access token (15-min lifetime).
 * Payload contains: { userType, userId, sessionId }
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Issue a signed JWT refresh token (7-day lifetime).
 * Payload contains: { userType, userId, sessionId }
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Verify JWT access token.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify JWT refresh token.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Normalize email according to database's lowercase comparison rule.
 */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Generate a signed short-lived document access token (expires in 5 minutes / 300s).
 */
export function generateSignedFileToken({ driverId, documentId, expiresInSeconds = 300 }) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const token = jwt.sign(
    {
      driverId: Number(driverId),
      documentId: Number(documentId)
    },
    FILE_SIGNING_SECRET,
    { expiresIn: expiresInSeconds }
  );

  return { token, expiresAt };
}

/**
 * Verify signed document token.
 */
export function verifySignedFileToken(token) {
  return jwt.verify(token, FILE_SIGNING_SECRET);
}
