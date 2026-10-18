import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireDriver } from '../middlewares/auth.middleware.js';
import {
  getOwnProfileHandler,
  setOwnAvailabilityHandler,
  listOwnDocumentsHandler,
  uploadOwnDocumentHandler,
  getOwnDocumentLinkHandler,
  listOwnTripsHandler,
  getOwnTripDetailHandler,
  startOwnTripHandler,
  closeOwnTripHandler
} from '../modules/driver/driver.controller.js';

const router = Router();

// Configure memory upload with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Protect all driver routes with Driver authentication
router.use(authenticate, requireDriver);

router.get('/profile', getOwnProfileHandler);
router.patch('/availability', setOwnAvailabilityHandler);

// KYC Document upload and retrieval
router.get('/documents', listOwnDocumentsHandler);
router.post('/documents', upload.single('file'), uploadOwnDocumentHandler);
router.get('/documents/:document_id/link', getOwnDocumentLinkHandler);

// Trip execution lifecycle
router.get('/trips', listOwnTripsHandler);
router.get('/trips/:trip_id', getOwnTripDetailHandler);
router.post('/trips/:trip_id/start', startOwnTripHandler);
router.post('/trips/:trip_id/close', closeOwnTripHandler);

export default router;
