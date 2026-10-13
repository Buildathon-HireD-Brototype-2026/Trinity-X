/**
 * Partner Notification Service
 * Implements PRD B-07 and database_updated0.2.md (notifications table)
 * Handles partner alerts for:
 * - ORDER_ACCEPTED
 * - ORDER_REJECTED (with rejection reason)
 * - STATEMENT_PUBLISHED
 */

import apiClient from './apiClient';
import { MOCK_COMPANY } from './mockData';

const STORAGE_NOTIFICATIONS_KEY = 'hired_b2b_notifications';

const INITIAL_NOTIFICATIONS = [
  {
    notification_id: 301,
    company_id: 101,
    type: 'STATEMENT_PUBLISHED',
    title: 'Month-End Statement Published',
    message: 'Billing statement INV-2026-09-101 for September 2026 has passed two-admin verification and is ready for settlement.',
    entity_id: 801,
    status: 'SENT',
    recipient_email: 'partner@apexlogistics.com',
    created_at: '2026-10-02T10:05:00Z',
    is_read: false,
  },
  {
    notification_id: 302,
    company_id: 101,
    type: 'ORDER_ACCEPTED',
    title: 'Order ORD-501 Accepted',
    message: 'Transport order to IGI Airport Terminal 3 was accepted by Admin and converted to Trip #1001. Driver assignment in progress.',
    entity_id: 501,
    status: 'SENT',
    recipient_email: 'partner@apexlogistics.com',
    created_at: '2026-10-10T08:30:00Z',
    is_read: false,
  },
  {
    notification_id: 303,
    company_id: 101,
    type: 'ORDER_REJECTED',
    title: 'Order ORD-498 Declined',
    message: 'Your order to Noida Sector 62 was rejected. Reason: No vetted driver available in requested corridor at specified time window.',
    entity_id: 498,
    status: 'SENT',
    recipient_email: 'partner@apexlogistics.com',
    created_at: '2026-10-09T11:20:00Z',
    is_read: true,
  },
];

function getStoredNotifications() {
  const data = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
  return INITIAL_NOTIFICATIONS;
}

function saveNotifications(notifications) {
  localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export const notificationService = {
  /**
   * Get all notifications for current company
   */
  async getNotifications() {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return getStoredNotifications();
    }

    const response = await apiClient.get('/notifications');
    return response.data.notifications || response.data;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      const items = getStoredNotifications();
      const updated = items.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      );
      saveNotifications(updated);
      return updated;
    }

    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all as read
   */
  async markAllAsRead() {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      const items = getStoredNotifications();
      const updated = items.map((n) => ({ ...n, is_read: true }));
      saveNotifications(updated);
      return updated;
    }

    await apiClient.post('/notifications/mark-all-read');
  },
};

export default notificationService;
