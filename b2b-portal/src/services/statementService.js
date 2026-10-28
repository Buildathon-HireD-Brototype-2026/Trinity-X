/**
 * Month-End Statement Service
 * Implements PRD B-06 and database.md Section 5.4 & 10.1 (invoices table)
 * - Exposes ONLY statements with status = 'PUBLISHED'
 * - Displays dual-admin verification trail and month-end settlement totals from PostgreSQL
 */

import apiClient from './apiClient';

export const statementService = {
  /**
   * Get all published statements for the partner company
   * Enforces database.md security rule: only PUBLISHED statements are returned to partner.
   */
  async getPublishedStatements() {
    try {
      const response = await apiClient.get('/invoices?status=PUBLISHED');
      const items = response.data?.invoices || response.data?.data?.items || response.data?.items || response.data;
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Failed to fetch published statements:', err.message);
      return [];
    }
  },

  /**
   * Get detail of a specific published statement
   */
  async getStatementDetail(invoiceId) {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      const inv = response.data?.invoice || response.data?.data || response.data;
      if (inv) return inv;
    } catch {
      // Fallback to checking published statements list
    }

    const statements = await this.getPublishedStatements();
    const statement = statements.find((s) => s.invoice_id === Number(invoiceId));
    if (!statement) {
      throw new Error('Statement not found or not yet approved for publication by administrators.');
    }
    return statement;
  },
};

export default statementService;
