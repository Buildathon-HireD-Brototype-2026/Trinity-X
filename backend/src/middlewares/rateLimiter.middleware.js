import rateLimit from 'express-rate-limit';

/**
 * IP-level rate limiter for authentication routes.
 * Mitigates brute-force attacks across accounts from a single IP address.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 requests per IP per 15 minutes (relaxed during test suite runs)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'error',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
  }
});
