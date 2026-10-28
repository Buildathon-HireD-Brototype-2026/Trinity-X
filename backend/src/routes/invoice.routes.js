import { Router } from 'express';
import { authenticate, requirePartner } from '../middlewares/auth.middleware.js';
import {
  listPartnerInvoicesHandler,
  getPartnerInvoiceDetailHandler
} from '../modules/invoice/invoice.controller.js';

const router = Router();

// Protect invoice/statement routes with Partner auth
router.use(authenticate, requirePartner);

router.get('/', listPartnerInvoicesHandler);
router.get('/:invoice_id', getPartnerInvoiceDetailHandler);

export default router;
