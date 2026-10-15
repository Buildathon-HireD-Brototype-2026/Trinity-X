import { Router } from 'express';
import { authenticate, requirePartner } from '../middlewares/auth.middleware.js';
import {
  listPartnerTripReportsHandler,
  getPartnerTripReportHandler
} from '../modules/report/report.controller.js';

const router = Router();

// Protect report routes with Partner auth
router.use(authenticate, requirePartner);

router.get('/trips', listPartnerTripReportsHandler);
router.get('/trips/:trip_id', getPartnerTripReportHandler);
router.get('/:trip_id/report', getPartnerTripReportHandler);

export default router;
