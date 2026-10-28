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
  setupDriverPassword,
  sendOtp,
  verifyOtp,
  registerWithOtp,
  resetPasswordWithOtp
} from '../modules/auth/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Rate limiting applied to public auth & onboarding endpoints
router.use('/login', authRateLimiter);
router.use('/admin/login', authRateLimiter);
router.use('/partner/login', authRateLimiter);
router.use('/driver/login', authRateLimiter);
router.use('/refresh', authRateLimiter);
router.use('/partner/register', authRateLimiter);
router.use('/register', authRateLimiter);
router.use('/otp', authRateLimiter);
router.use('/forgot-password', authRateLimiter);
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

// Dedicated Email OTP & Account Creation Routes (5 Security Pillars)
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/register', registerWithOtp);
router.post('/forgot-password/send-otp', sendOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);

// Legacy onboarding & password setup routes
router.post('/partner/register', partnerRegister);
router.post('/partner/password/setup', authRateLimiter, setupPartnerPassword);
router.post('/driver/password/setup', authRateLimiter, setupDriverPassword);

export default router;

