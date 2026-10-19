import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireDriver } from '../middlewares/auth.middleware.js';
import {
  getOwnProfileHandler,
  uploadPhotoHandler,
  getHeadOfficeHandler,
  setOwnAvailabilityHandler,
  listOwnLeavesHandler,
  createOwnLeaveHandler,
  deleteOwnLeaveHandler,
  listOwnDocumentsHandler,
  uploadOwnDocumentHandler,
  getOwnDocumentLinkHandler,
  listOwnTripsHandler,
  getOwnTripDetailHandler,
  startOwnTripHandler,
  closeOwnTripHandler,
  listTripExpensesHandler,
  createTripExpenseHandler,
  updateTripExpenseHandler,
  deleteTripExpenseHandler,
  confirmTripExpensesHandler,
  getOwnWalletHandler,
  recordLocationHandler,
  recordBatchLocationsHandler
} from '../modules/driver/driver.controller.js';

const router = Router();

// Configure memory upload with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Protect all driver routes with Driver authentication
router.use(authenticate, requireDriver);

// Profile and Head Office
router.get('/profile', getOwnProfileHandler);
router.post('/profile/photo', upload.single('photo'), uploadPhotoHandler);
router.get('/office', getHeadOfficeHandler);

// Availability & Leaves
router.patch('/availability', setOwnAvailabilityHandler);
router.get('/leaves', listOwnLeavesHandler);
router.post('/leaves', createOwnLeaveHandler);
router.delete('/leaves/:leave_id', deleteOwnLeaveHandler);

// KYC Document upload and retrieval
router.get('/documents', listOwnDocumentsHandler);
router.post('/documents', upload.single('file'), uploadOwnDocumentHandler);
router.get('/documents/:document_id/link', getOwnDocumentLinkHandler);

// Trip execution lifecycle & expenses
router.get('/trips', listOwnTripsHandler);
router.get('/trips/:trip_id', getOwnTripDetailHandler);
router.post('/trips/:trip_id/start', startOwnTripHandler);
router.post('/trips/:trip_id/close', closeOwnTripHandler);

router.get('/trips/:trip_id/expenses', listTripExpensesHandler);
router.post('/trips/:trip_id/expenses', createTripExpenseHandler);
router.put('/trips/:trip_id/expenses/:expense_id', updateTripExpenseHandler);
router.delete('/trips/:trip_id/expenses/:expense_id', deleteTripExpenseHandler);
router.post('/trips/:trip_id/confirm-expenses', confirmTripExpensesHandler);

// Driver Wallet
router.get('/wallet', getOwnWalletHandler);

// Live Location Pings
router.post('/location', recordLocationHandler);
router.post('/locations/batch', recordBatchLocationsHandler);

export default router;
