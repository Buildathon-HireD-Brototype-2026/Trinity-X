import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';

function getDefaultTitle(type) {
  switch (type) {
    case 'ORDER_ACCEPTED':
      return 'Order Accepted';
    case 'ORDER_REJECTED':
      return 'Order Rejected';
    case 'STATEMENT_PUBLISHED':
      return 'Month-End Statement Published';
    case 'DRIVER_ASSIGNED':
      return 'Driver Assigned';
    default:
      return 'Platform Notification';
  }
}

function getDefaultMessage(n) {
  if (n.lastError && n.lastError !== 'READ') return n.lastError;
  switch (n.type) {
    case 'ORDER_ACCEPTED':
      return `Transport order ORD-${n.entityId} was accepted by Admin and scheduled for dispatch.`;
    case 'ORDER_REJECTED':
      return `Your transport order ORD-${n.entityId} was rejected by dispatch.`;
    case 'STATEMENT_PUBLISHED':
      return `Your corporate billing statement for settlement has been verified and published.`;
    default:
      return `Notification regarding ${n.entityType} #${n.entityId}.`;
  }
}

export function formatNotification(n) {
  if (!n) return null;
  return {
    notification_id: n.notificationId,
    company_id: n.recipientType === 'PARTNER' ? n.recipientId : undefined,
    driver_id: n.recipientType === 'DRIVER' ? n.recipientId : undefined,
    type: n.type,
    title: getDefaultTitle(n.type),
    message: getDefaultMessage(n),
    entity_type: n.entityType,
    entity_id: n.entityId,
    status: n.status,
    recipient_email: n.recipientEmail,
    created_at: n.createdAt ? n.createdAt.toISOString() : null,
    is_read: n.lastError === 'READ'
  };
}

/**
 * List notifications for the authenticated user.
 */
export async function listNotifications(userType, userId) {
  const notifications = await prisma.notification.findMany({
    where: {
      recipientType: userType,
      recipientId: Number(userId)
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return notifications.map(formatNotification);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(userType, userId, notificationId) {
  const notif = await prisma.notification.findFirst({
    where: {
      notificationId: Number(notificationId),
      recipientType: userType,
      recipientId: Number(userId)
    }
  });

  if (!notif) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
  }

  const updated = await prisma.notification.update({
    where: { notificationId: notif.notificationId },
    data: { lastError: 'READ' }
  });

  return formatNotification(updated);
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsAsRead(userType, userId) {
  await prisma.notification.updateMany({
    where: {
      recipientType: userType,
      recipientId: Number(userId),
      OR: [
        { lastError: null },
        { lastError: { not: 'READ' } }
      ]
    },
    data: { lastError: 'READ' }
  });

  return { success: true };
}
