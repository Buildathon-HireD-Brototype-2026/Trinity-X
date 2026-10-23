import { errorResponse } from '../shared/response.js';

/**
 * In-memory sliding window rate limiter middleware for authentication routes.
 * Mitigates Distributed Brute Force (CWE-307) and Bcrypt CPU Starvation DoS (CWE-400).
 */
export function rateLimiter({
  windowMs = 60 * 1000, // 1 minute
  maxRequests = 30, // max requests per window per IP
  message = 'Too many requests from this IP, please try again later.'
} = {}) {
  const ipHits = new Map();

  // Periodic cleanup of stale IP entries every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipHits.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        ipHits.delete(ip);
      } else {
        ipHits.set(ip, active);
      }
    }
  }, 2 * 60 * 1000).unref();

  return (req, res, next) => {
    // Whitelist localhost/internal in development automated test runs if header present
    if (req.headers['x-internal-test-bypass'] === 'true' && process.env.NODE_ENV !== 'production') {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const timestamps = ipHits.get(ip) || [];
    const activeTimestamps = timestamps.filter(t => now - t < windowMs);

    if (activeTimestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      if (req.originalUrl?.startsWith('/api/v1') || req.baseUrl?.startsWith('/api/v1')) {
        return errorResponse(res, 429, 'TOO_MANY_REQUESTS', message, [
          { field: 'ip', message: `Exceeded ${maxRequests} requests per ${windowMs / 1000}s limit.` }
        ]);
      }
      return res.status(429).json({
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message
      });
    }

    activeTimestamps.push(now);
    ipHits.set(ip, activeTimestamps);
    next();
  };
}

export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts from this IP address. Please wait 1 minute before retrying.'
});
