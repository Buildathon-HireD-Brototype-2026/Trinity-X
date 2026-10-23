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
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Rate limiting applied to public auth & onboarding endpoints
router.use('/login', authRateLimiter);
router.use('/admin/login', authRateLimiter);
router.use('/partner/login', authRateLimiter);
router.use('/driver/login', authRateLimiter);
router.use('/partner/register', authRateLimiter);
router.use('/partner/password/setup', authRateLimiter);
router.use('/driver/password/setup', authRateLimiter);

// Core authentication routes
router.post('/login', unifiedLogin);
router.post('/admin/login', adminLogin);
router.post('/partner/login', partnerLogin);
router.post('/driver/login', driverLogin);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Onboarding & password setup routes
router.post('/partner/register', partnerRegister);
router.post('/partner/password/setup', setupPartnerPassword);
router.post('/driver/password/setup', setupDriverPassword);

export default router;
