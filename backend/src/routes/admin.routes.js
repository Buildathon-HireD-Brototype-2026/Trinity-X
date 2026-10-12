import { Router } from 'express';
import {
  createAdmin,
  createPartner,
  createDriver,
  activateDriverAccount,
  listRegistrations,
  approveRegistration,
  rejectRegistration
} from '../modules/admin/admin.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all admin management routes
router.use(authenticate, requireAdmin);

// Account creation endpoints
router.post('/admins', createAdmin);
router.post('/partners', createPartner);
router.post('/drivers', createDriver);
router.patch('/drivers/:driverId/activate', activateDriverAccount);

// Partner registration review endpoints
router.get('/partner-registrations', listRegistrations);
router.patch('/partner-registrations/:requestId/approve', approveRegistration);
router.patch('/partner-registrations/:requestId/reject', rejectRegistration);

export default router;
