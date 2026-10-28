/**
 * Post-Trip Reporting Service
 * Implements PRD B-05 and database.md Section 12 (Reports and the Trip Report)
 * - Filterable reports for CLOSED trips
 * - Sanitized data: partner trip reports and corporate spend details from PostgreSQL
 */

import apiClient from './apiClient';

export const reportService = {
  /**
   * Retrieve closed trips visible to the partner company
   */
  async getClosedTripReports() {
    try {
      const response = await apiClient.get('/reports/trips?status=CLOSED');
      const items = response.data?.reports || response.data?.data?.items || response.data?.items || response.data;
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Failed to fetch closed trip reports:', err.message);
      return [];
    }
  },

  /**
   * Get single trip report details
   */
  async getTripReport(tripId) {
    try {
      const response = await apiClient.get(`/reports/trips/${tripId}`);
      const report = response.data?.report || response.data?.data || response.data;
      if (report) return report;
    } catch {
      // Fallback to checking closed trip reports list
    }

    const reports = await this.getClosedTripReports();
    const report = reports.find((r) => r.trip_id === Number(tripId));
    if (!report) throw new Error('Trip report not found or trip is not yet closed.');
    return report;
  },
};

export default reportService;
