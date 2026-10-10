import { Router } from 'express';
import {
  adminLogin,
  partnerLogin,
  driverLogin,
  refreshToken,
  logout,
  getMe,
  partnerRegister,
  setupPartnerPassword,
  setupDriverPassword
} from '../modules/auth/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Core authentication routes
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
