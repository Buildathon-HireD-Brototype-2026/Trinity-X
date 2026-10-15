import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from './notification.service.js';

/**
 * GET /notifications
 */
export async function listNotificationsHandler(req, res, next) {
  try {
    const { userType, userId } = req.user;
    const notifications = await listNotifications(userType, userId);

    return res.status(200).json({
      success: true,
      notifications,
      data: notifications,
      message: 'Notifications retrieved successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /notifications/:notification_id/read
 */
export async function markNotificationAsReadHandler(req, res, next) {
  try {
    const { userType, userId } = req.user;
    const notificationId = req.params.notification_id || req.params.notificationId || req.params.id;
    const result = await markNotificationAsRead(userType, userId, notificationId);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Notification marked as read.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications/mark-all-read
 */
export async function markAllNotificationsAsReadHandler(req, res, next) {
  try {
    const { userType, userId } = req.user;
    await markAllNotificationsAsRead(userType, userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    next(err);
  }
}
