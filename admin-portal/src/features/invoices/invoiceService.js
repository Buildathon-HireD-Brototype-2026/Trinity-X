/**
 * Invoice & Month-End Statement Verification Service
 * Enforces two-person check on each month-end statement before dispatch.
 * Connected directly to backend PostgreSQL via apiClient.
 */
import apiClient from '../../services/apiClient';

class InvoiceService {
  /**
   * Fetch all invoices with optional status/search filters
   * Connected to backend: GET /api/v1/admin/invoices
   */
  async getInvoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    const res = await apiClient.get(`/admin/invoices${queryStr}`);
    const remoteItems = res?.invoices || res?.data?.items || res?.data || [];
    return Array.isArray(remoteItems) ? remoteItems : [];
  }

  /**
   * Fetch single invoice by ID
   * Connected to backend: GET /api/v1/admin/invoices/:id
   */
  async getInvoiceById(id) {
    const cleanId = String(id).replace(/\D/g, '') || id;
    const res = await apiClient.get(`/admin/invoices/${cleanId}`);
    return res?.invoice || res?.data;
  }

  /**
   * First Approval (Creator or First Admin)
   * Connected to backend: POST /api/v1/admin/invoices/:id/verify-first
   */
  async approveFirst(id, adminUser) {
    const cleanId = String(id).replace(/\D/g, '') || id;
    const res = await apiClient.post(`/admin/invoices/${cleanId}/verify-first`, {});
    return res?.invoice || res?.data?.invoice || { id, status: 'PENDING_APPROVAL_2' };
  }

  /**
   * Second Approval (Must be a distinct active admin)
   * Connected to backend: POST /api/v1/admin/invoices/:id/verify-second
   */
  async approveSecond(id, adminUser) {
    const cleanId = String(id).replace(/\D/g, '') || id;
    const res = await apiClient.post(`/admin/invoices/${cleanId}/verify-second`, {});
    return res?.invoice || res?.data?.invoice || { id, status: 'VERIFIED' };
  }

  /**
   * Dispatch / Send Verified Invoice to Corporate B2B Email
   * Connected to backend: POST /api/v1/admin/invoices/:id/dispatch-email
   */
  async sendInvoiceToCompany(id, { recipientEmail, ccEmails = '', notes = '', senderAdmin } = {}) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('Please enter a valid corporate recipient email address.');
    }

    const cleanId = String(id).replace(/\D/g, '') || id;
    const res = await apiClient.post(`/admin/invoices/${cleanId}/dispatch-email`, {
      recipientEmail,
      ccEmails,
      notes
    });

    return res?.invoice || res?.data?.invoice || { id, status: 'SENT' };
  }

  /**
   * Create a new draft statement for a corporate company
   */
  async createInvoice(data, creatorAdmin) {
    if (!data.companyName || !data.companyEmail) {
      throw new Error('Company name and billing email are required.');
    }

    const payload = {
      companyId: Number(data.companyId) || 1,
      billingPeriod: data.billingPeriod || 'Current Month',
      subtotal: Number(data.subtotal) || 0,
      totalAmount: Number(data.totalAmount || data.subtotal) || 0
    };

    const res = await apiClient.post('/admin/invoices', payload);
    return res?.invoice || res?.data;
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
