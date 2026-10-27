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

// Admin Account Management & Onboarding controllers
import {
  listAdminsHandler,
  getAdminHandler,
  createAdminHandler,
  updateAdminHandler,
  changeAdminStatusHandler,
  createPartner,
  createDriver,
  activateDriverAccount,
  listRegistrations,
  approveRegistration,
  rejectRegistration
} from '../modules/admin/admin.controller.js';

// Order & Trip Management controllers
import {
  listAdminOrdersHandler,
  getAdminOrderHandler,
  acceptOrderHandler,
  rejectOrderHandler,
  assignDriverHandler
} from '../modules/order/order.controller.js';

// Invoice & Month-End Verification controllers
import {
  listAdminInvoicesHandler,
  getAdminInvoiceHandler,
  verifyFirstInvoiceHandler,
  verifySecondInvoiceHandler,
  dispatchInvoiceEmailHandler
} from '../modules/invoice/invoice.controller.js';

const router = Router();

// Protect all admin management routes with Admin authentication
router.use(authenticate, requireAdmin);

// ============================================================================
// Admin Account Management Endpoints
// ============================================================================
router.get('/admins', listAdminsHandler);
router.post('/admins', createAdminHandler);
router.get('/admins/:admin_id', validateIdParam('admin_id'), getAdminHandler);
router.patch('/admins/:admin_id', validateIdParam('admin_id'), updateAdminHandler);
router.patch('/admins/:admin_id/status', validateIdParam('admin_id'), changeAdminStatusHandler);

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
// Order & Trip Management Endpoints (OpenAPI spec: x-prd: A-02, A-05, A-08)
// ============================================================================
router.get('/orders', listAdminOrdersHandler);
router.get('/orders/:order_id', validateIdParam('order_id'), getAdminOrderHandler);
router.post('/orders/:order_id/accept', validateIdParam('order_id'), acceptOrderHandler);
router.post('/orders/:order_id/reject', validateIdParam('order_id'), rejectOrderHandler);
router.post('/trips/:trip_id/assign-driver', validateIdParam('trip_id'), assignDriverHandler);

// ============================================================================
// Month-End Invoice Verification Endpoints
// ============================================================================
router.get('/invoices', listAdminInvoicesHandler);
router.get('/invoices/:invoice_id', getAdminInvoiceHandler);
router.post('/invoices/:invoice_id/verify-first', verifyFirstInvoiceHandler);
router.post('/invoices/:invoice_id/verify-second', verifySecondInvoiceHandler);
router.post('/invoices/:invoice_id/dispatch-email', dispatchInvoiceEmailHandler);

// ============================================================================
// Preserved Baseline Onboarding Endpoints
// ============================================================================
router.post('/partners', createPartner);
router.post('/drivers', createDriver);
router.patch('/drivers/:driverId/activate', activateDriverAccount);

router.get('/partner-registrations', listRegistrations);
router.patch('/partner-registrations/:requestId/approve', approveRegistration);
router.patch('/partner-registrations/:requestId/reject', rejectRegistration);

export default router;
