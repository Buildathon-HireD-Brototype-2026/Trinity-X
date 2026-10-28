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
  recordBatchLocationsHandler,
  uploadTripSelfieHandler,
  uploadStartSelfieHandler
} from '../modules/driver/driver.controller.js';
import { errorResponse } from '../shared/response.js';
import {
  createTripSosHandler,
  getActiveTripSosHandler,
  updateDriverSosLocationHandler,
  cancelDriverSosHandler
} from '../modules/sos/sos.controller.js';

const router = Router();

// Configure memory upload with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Configure memory upload for selfie images (max 5MB, jpeg/png/webp)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/octet-stream'];
const selfieMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAllowedMime = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const hasImageExt = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname || '');
    if (!isAllowedMime && !hasImageExt) {
      const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

function handleSelfieUpload(req, res, next) {
  selfieMulter.single('selfie')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 400, 'FILE_TOO_LARGE', 'Selfie image exceeds maximum limit of 5 MB.');
        }
        return errorResponse(res, 400, 'UPLOAD_ERROR', err.message);
      }
      return errorResponse(res, err.statusCode || 400, err.code || 'INVALID_FILE', err.message);
    }
    next();
  });
}

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
router.post('/trips/:trip_id/start', handleSelfieUpload, startOwnTripHandler);
router.post('/trips/:tripId/start', handleSelfieUpload, startOwnTripHandler);
router.post('/trips/:trip_id/start-selfie', handleSelfieUpload, uploadStartSelfieHandler);
router.post('/trips/:tripId/start-selfie', handleSelfieUpload, uploadStartSelfieHandler);
router.post('/trips/:trip_id/selfie', handleSelfieUpload, uploadStartSelfieHandler);
router.post('/trips/:tripId/selfie', handleSelfieUpload, uploadStartSelfieHandler);
router.post('/trips/:trip_id/close', closeOwnTripHandler);
router.post('/trips/:tripId/close', closeOwnTripHandler);

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

// ============================================================================
// Trip Emergency SOS Endpoints
// ============================================================================
router.post('/trips/:tripId/sos', createTripSosHandler);
router.post('/trips/:trip_id/sos', createTripSosHandler);
router.get('/trips/:tripId/sos/active', getActiveTripSosHandler);
router.get('/trips/:trip_id/sos/active', getActiveTripSosHandler);
router.patch('/sos/:alertId/location', updateDriverSosLocationHandler);
router.patch('/sos/:alertId/cancel', cancelDriverSosHandler);

export default router;
