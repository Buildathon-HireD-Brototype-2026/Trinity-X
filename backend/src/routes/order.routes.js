import { Router } from 'express';
import { authenticate, requirePartner } from '../middlewares/auth.middleware.js';
import {
  listPartnerOrdersHandler,
  createPartnerOrderHandler,
  getPartnerOrderHandler
} from '../modules/order/order.controller.js';

const router = Router();

// Protect partner order routes
router.use(authenticate, requirePartner);

router.get('/', listPartnerOrdersHandler);
router.post('/', createPartnerOrderHandler);
router.get('/:order_id', getPartnerOrderHandler);

export default router;
