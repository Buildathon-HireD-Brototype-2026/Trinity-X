import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { validateIdParam } from '../middlewares/validate.middleware.js';

// Company Management controllers
import {
  listCompaniesHandler,
  createCompanyHandler,
  getCompanyHandler,
  updateCompanyHandler,
  updatePayoutSplitHandler,
  changeCompanyStatusHandler
} from '../modules/company/company.controller.js';

// Driver Management controllers
import {
  listDriversHandler,
  getDriverHandler,
  listDriverDocumentsHandler,
  getDocumentSignedLinkHandler,
  changeDriverStatusHandler,
  getDriverWalletHandler,
  createWalletDebitHandler
} from '../modules/driver/driver.controller.js';

// Existing Admin controllers
import {
  createAdmin,
  createPartner,
  createDriver,
  activateDriverAccount,
  listRegistrations,
  approveRegistration,
  rejectRegistration
} from '../modules/admin/admin.controller.js';

const router = Router();

// Protect all admin management routes with Admin authentication
router.use(authenticate, requireAdmin);

// ============================================================================
// Company Management Endpoints (OpenAPI spec: x-prd: A-10, A-11)
// ============================================================================
router.get('/companies', listCompaniesHandler);
router.post('/companies', createCompanyHandler);
router.get('/companies/:company_id', validateIdParam('company_id'), getCompanyHandler);
router.patch('/companies/:company_id', validateIdParam('company_id'), updateCompanyHandler);
router.patch('/companies/:company_id/payout-split', validateIdParam('company_id'), updatePayoutSplitHandler);
router.patch('/companies/:company_id/status', validateIdParam('company_id'), changeCompanyStatusHandler);

// ============================================================================
// Driver Management Endpoints (OpenAPI spec: x-prd: A-07, A-09, D-12)
// ============================================================================
router.get('/drivers', listDriversHandler);
router.get('/drivers/:driver_id', validateIdParam('driver_id'), getDriverHandler);
router.get('/drivers/:driver_id/documents', validateIdParam('driver_id'), listDriverDocumentsHandler);
router.get('/drivers/:driver_id/documents/:document_id/link', validateIdParam('driver_id'), validateIdParam('document_id'), getDocumentSignedLinkHandler);
router.patch('/drivers/:driver_id/status', validateIdParam('driver_id'), changeDriverStatusHandler);
router.get('/drivers/:driver_id/wallet', validateIdParam('driver_id'), getDriverWalletHandler);
router.post('/drivers/:driver_id/wallet-debits', validateIdParam('driver_id'), createWalletDebitHandler);

// ============================================================================
// Preserved Baseline Admin Account & Onboarding Endpoints
// ============================================================================
router.post('/admins', createAdmin);
router.post('/partners', createPartner);
router.post('/drivers', createDriver);
router.patch('/drivers/:driverId/activate', activateDriverAccount);

router.get('/partner-registrations', listRegistrations);
router.patch('/partner-registrations/:requestId/approve', approveRegistration);
router.patch('/partner-registrations/:requestId/reject', rejectRegistration);

export default router;
