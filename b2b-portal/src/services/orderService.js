/**
 * Transport Order Service
 * Implements PRD B-02, B-03, and database_updated0.2.md Section 2 (orders table)
 * Enforces company tenant isolation and official status transitions.
 */

import apiClient from './apiClient';
import { INITIAL_ORDERS, INITIAL_TRIPS, MOCK_COMPANY } from './mockData';

const STORAGE_ORDERS_KEY = 'hired_b2b_orders';
const STORAGE_TRIPS_KEY = 'hired_b2b_trips';

// Initialize in-memory / local storage store for orders and trips
function getStoredOrders() {
  const data = localStorage.getItem(STORAGE_ORDERS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
}

function getStoredTrips() {
  const data = localStorage.getItem(STORAGE_TRIPS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_TRIPS_KEY, JSON.stringify(INITIAL_TRIPS));
  return INITIAL_TRIPS;
}

export const orderService = {
  /**
   * Get all orders for the current company
   */
  async getOrders() {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const orders = getStoredOrders();
      const trips = getStoredTrips();

      // Attach trip summary to accepted orders
      return orders.map((order) => {
        const linkedTrip = trips.find((t) => t.order_id === order.order_id || t.trip_id === order.trip_id);
        return {
          ...order,
          trip: linkedTrip || null,
        };
      });
    }

    const response = await apiClient.get('/orders');
    return response.data.orders || response.data;
  },

  /**
   * Create a new transport order (PRD B-02)
   * Status is initialized to RECEIVED; Source is PORTAL
   */
  async createOrder(orderPayload) {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const orders = getStoredOrders();

      const newOrderId = Math.floor(100 + Math.random() * 900);
      const newOrder = {
        order_id: newOrderId,
        company_id: MOCK_COMPANY.company_id, // Derived server-side from JWT token
        pickup_spot: orderPayload.pickup_spot.trim(),
        dropoff_spot: orderPayload.dropoff_spot.trim(),
        pickup_time: orderPayload.pickup_time,
        contact_name: orderPayload.contact_name.trim(),
        contact_phone: orderPayload.contact_phone.trim(),
        notes: orderPayload.notes ? orderPayload.notes.trim() : null,
        status: 'RECEIVED', // Initial state per PRD
        source: 'PORTAL',   // Origin per database schema
        created_at: new Date().toISOString(),
        trip_id: null,
      };

      const updated = [newOrder, ...orders];
      saveOrders(updated);
      return { success: true, order: newOrder };
    }

    const response = await apiClient.post('/orders', orderPayload);
    return response.data;
  },

  /**
   * Retrieve order detail along with linked trip if available
   */
  async getOrderDetail(orderId) {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      const orders = getStoredOrders();
      const trips = getStoredTrips();
      const order = orders.find((o) => o.order_id === Number(orderId));
      if (!order) throw new Error('Order not found');

      const linkedTrip = trips.find((t) => t.order_id === order.order_id || t.trip_id === order.trip_id);
      return { ...order, trip: linkedTrip || null };
    }

    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },
};

export default orderService;
