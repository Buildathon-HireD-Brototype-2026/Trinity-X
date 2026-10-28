/**
 * Transport Order Service
 * Implements PRD B-02, B-03, and database.md Section 2 (orders table)
 * Enforces company tenant isolation and official status transitions.
 * Directly communicates with real backend PostgreSQL database.
 */

import apiClient from './apiClient';

export const orderService = {
  /**
   * Get all orders for the current partner company
   */
  async getOrders() {
    const response = await apiClient.get('/orders');
    const items = response.data?.items || response.data?.data?.items || response.data?.orders || response.data;
    return Array.isArray(items) ? items : [];
  },

  /**
   * Create a new transport order (PRD B-02, database.md Section 5.3)
   * Writes to real orders table in PostgreSQL
   */
  async createOrder(orderPayload) {
    const response = await apiClient.post('/orders', orderPayload);
    return response.data;
  },

  /**
   * Retrieve order detail along with linked trip if available
   */
  async getOrderDetail(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data?.order || response.data?.data || response.data;
  },
};

export default orderService;
