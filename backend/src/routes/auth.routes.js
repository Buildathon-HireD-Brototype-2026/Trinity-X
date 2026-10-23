import { Router } from 'express';
import {
  adminLogin,
  partnerLogin,
  driverLogin,
  unifiedLogin,
  refreshToken,
  logout,
  getMe,
  partnerRegister,
  setupPartnerPassword,
  setupDriverPassword
} from '../modules/auth/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/ratelimit.middleware.js';

const router = Router();

// Core authentication routes with brute force and DoS rate limiting
router.post('/login', authRateLimiter, unifiedLogin);
router.post('/admin/login', authRateLimiter, adminLogin);
router.post('/partner/login', authRateLimiter, partnerLogin);
router.post('/driver/login', authRateLimiter, driverLogin);
router.post('/refresh', authRateLimiter, refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Onboarding & password setup routes
router.post('/partner/register', partnerRegister);
router.post('/partner/password/setup', authRateLimiter, setupPartnerPassword);
router.post('/driver/password/setup', authRateLimiter, setupDriverPassword);

export default router;
