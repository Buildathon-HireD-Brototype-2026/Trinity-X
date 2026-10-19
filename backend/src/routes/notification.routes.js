import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  listNotificationsHandler,
  markNotificationAsReadHandler,
  markAllNotificationsAsReadHandler
} from '../modules/notification/notification.controller.js';

const router = Router();

// Protect notification routes with authenticate
router.use(authenticate);

router.get('/', listNotificationsHandler);
router.patch('/:id/read', markNotificationAsReadHandler);
router.patch('/:notification_id/read', markNotificationAsReadHandler);
router.post('/mark-all-read', markAllNotificationsAsReadHandler);

export default router;
