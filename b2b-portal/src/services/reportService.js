/**
 * Post-Trip Reporting Service
 * Implements PRD B-05 and database_updated0.2.md Section 12.1
 * - Filterable reports for CLOSED trips
 * - Sanitized data: strictly excludes driver commission/split (only revealed in PUBLISHED invoices)
 */

import apiClient from './apiClient';
import { INITIAL_TRIPS, INITIAL_ORDERS, MOCK_COMPANY } from './mockData';

const STORAGE_TRIPS_KEY = 'hired_b2b_trips';
const STORAGE_ORDERS_KEY = 'hired_b2b_orders';

function getStoredTrips() {
  const data = localStorage.getItem(STORAGE_TRIPS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  return INITIAL_TRIPS;
}

function getStoredOrders() {
  const data = localStorage.getItem(STORAGE_ORDERS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  return INITIAL_ORDERS;
}

export const reportService = {
  /**
   * Retrieve closed trips visible to the partner company
   */
  async getClosedTripReports() {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const trips = getStoredTrips();
      const orders = getStoredOrders();

      // Only trips with status = 'CLOSED' are viewable as Trip Reports (PRD B-05)
      const closedTrips = trips.filter((t) => t.status === 'CLOSED');

      return closedTrips.map((trip) => {
        const order = orders.find((o) => o.order_id === trip.order_id);
        const expensesTotal = (trip.expenses || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

        return {
          trip_id: trip.trip_id,
          order_id: trip.order_id,
          pickup_spot: trip.pickup_spot || order?.pickup_spot || 'N/A',
          dropoff_spot: trip.dropoff_spot || order?.dropoff_spot || 'N/A',
          pickup_time: trip.pickup_time || order?.pickup_time,
          contact_name: trip.contact_name || order?.contact_name || 'N/A',
          contact_phone: trip.contact_phone || order?.contact_phone || 'N/A',
          driver_name: trip.driver_name,
          driver_phone: trip.driver_phone,
          started_at: trip.started_at,
          closed_at: trip.closed_at,
          amount: trip.amount,
          expenses: trip.expenses || [],
          expenses_total: expensesTotal,
          total_spend: Number(trip.amount) + expensesTotal,
          company_id: MOCK_COMPANY.company_id,
        };
      });
    }

    const response = await apiClient.get('/reports/trips?status=CLOSED');
    return response.data.reports || response.data;
  },

  /**
   * Get single trip report details
   */
  async getTripReport(tripId) {
    const reports = await this.getClosedTripReports();
    const report = reports.find((r) => r.trip_id === Number(tripId));
    if (!report) throw new Error('Trip report not found or trip is not yet closed.');
    return report;
  },
};

export default reportService;
