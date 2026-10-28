/**
 * Partner Notification Service
 * Implements PRD B-07 and database.md (notifications table)
 * Handles partner alerts directly with PostgreSQL notifications table
 */

import apiClient from './apiClient';

export const notificationService = {
  /**
   * Get all notifications for current partner company
   */
  async getNotifications() {
    try {
      const response = await apiClient.get('/notifications');
      const items = response.data?.notifications || response.data?.data || response.data;
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
      return [];
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    await apiClient.post('/notifications/mark-all-read');
  },
};

export default notificationService;
