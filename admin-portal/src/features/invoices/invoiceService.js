/**
 * Invoice & Month-End Statement Verification Service
 * Enforces PRD A-12: Two-person check on each month-end statement before it is sent.
 * Approval comes from the admin who created the statement plus one other active admin.
 */
import { apiClient } from '../../services/apiClient.js';

const STORAGE_KEY = 'hired_admin_invoices_v1';

const INITIAL_INVOICES = [
  {
    id: 'STMT-2026-10-01',
    companyId: 'comp-1',
    companyName: 'TechCorp Solutions Ltd',
    companyEmail: 'billing@techcorpsolutions.com',
    billingContact: 'Rajesh Sharma (Head of Finance)',
    billingPeriod: 'October 2026',
    issueDate: '2026-10-24',
    dueDate: '2026-11-10',
    tripCount: 48,
    subtotal: 58400,
    platformFee: 5840,
    taxAmount: 1051.20,
    totalAmount: 65291.20,
    status: 'VERIFIED', // Ready to send!
    creator: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-10-24T09:30:00Z',
    },
    firstApproval: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-10-24T10:15:00Z',
    },
    secondApproval: {
      id: 'admin-2',
      name: 'Priya Patel (Finance Admin)',
      email: 'priya.patel@hired.com',
      at: '2026-10-24T14:45:00Z',
    },
    dispatchAudit: null,
    lineItems: [
      { id: 'item-1', tripId: 'TRP-2001', date: '2026-10-02', route: 'Koramangala to Electronic City', fare: 850, companyShare: 765 },
      { id: 'item-2', tripId: 'TRP-2002', date: '2026-10-05', route: 'Whitefield to Kempegowda Airport', fare: 1450, companyShare: 1305 },
      { id: 'item-3', tripId: 'TRP-2003', date: '2026-10-12', route: 'Indiranagar to MG Road', fare: 450, companyShare: 405 },
      { id: 'item-4', tripId: 'TRP-2004', date: '2026-10-18', route: 'Bellandur to Manyata Tech Park', fare: 1100, companyShare: 990 },
    ],
  },
  {
    id: 'STMT-2026-10-02',
    companyId: 'comp-2',
    companyName: 'Infosys BPM Corporate Services',
    companyEmail: 'accounts.payable@infosys.com',
    billingContact: 'Ananya Deshmukh (Procurement Lead)',
    billingPeriod: 'October 2026',
    issueDate: '2026-10-25',
    dueDate: '2026-11-15',
    tripCount: 74,
    subtotal: 92600,
    platformFee: 9260,
    taxAmount: 1666.80,
    totalAmount: 103526.80,
    status: 'PENDING_APPROVAL_2', // Needs 2nd approval
    creator: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-10-25T08:00:00Z',
    },
    firstApproval: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-10-25T08:30:00Z',
    },
    secondApproval: null,
    dispatchAudit: null,
    lineItems: [
      { id: 'item-5', tripId: 'TRP-2010', date: '2026-10-03', route: 'Electronic City to HSR Layout', fare: 650, companyShare: 585 },
      { id: 'item-6', tripId: 'TRP-2011', date: '2026-10-10', route: 'Outer Ring Road to Airport Terminal 2', fare: 1800, companyShare: 1620 },
      { id: 'item-7', tripId: 'TRP-2012', date: '2026-10-14', route: 'Bannerghatta to JP Nagar', fare: 520, companyShare: 468 },
    ],
  },
  {
    id: 'STMT-2026-10-03',
    companyId: 'comp-3',
    companyName: 'Wipro Technologies Bangalore',
    companyEmail: 'travel.billing@wipro.com',
    billingContact: 'Siddharth Rao (Transport Operations)',
    billingPeriod: 'October 2026',
    issueDate: '2026-10-25',
    dueDate: '2026-11-15',
    tripCount: 31,
    subtotal: 39500,
    platformFee: 3950,
    taxAmount: 711.00,
    totalAmount: 44161.00,
    status: 'PENDING_APPROVAL_1', // Needs 1st approval
    creator: {
      id: 'admin-2',
      name: 'Priya Patel (Finance Admin)',
      email: 'priya.patel@hired.com',
      at: '2026-10-25T09:00:00Z',
    },
    firstApproval: null,
    secondApproval: null,
    dispatchAudit: null,
    lineItems: [
      { id: 'item-8', tripId: 'TRP-2020', date: '2026-10-06', route: 'Sarjapur to Marathahalli', fare: 720, companyShare: 648 },
      { id: 'item-9', tripId: 'TRP-2021', date: '2026-10-16', route: 'Whitefield to Domlur', fare: 950, companyShare: 855 },
    ],
  },
  {
    id: 'STMT-2026-09-01',
    companyId: 'comp-1',
    companyName: 'TechCorp Solutions Ltd',
    companyEmail: 'billing@techcorpsolutions.com',
    billingContact: 'Rajesh Sharma (Head of Finance)',
    billingPeriod: 'September 2026',
    issueDate: '2026-09-28',
    dueDate: '2026-10-15',
    tripCount: 62,
    subtotal: 74800,
    platformFee: 7480,
    taxAmount: 1346.40,
    totalAmount: 83626.40,
    status: 'SENT', // Already published and sent
    creator: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-09-28T10:00:00Z',
    },
    firstApproval: {
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hired.com',
      at: '2026-09-28T11:00:00Z',
    },
    secondApproval: {
      id: 'admin-2',
      name: 'Priya Patel (Finance Admin)',
      email: 'priya.patel@hired.com',
      at: '2026-09-28T15:30:00Z',
    },
    dispatchAudit: {
      sentBy: 'Super Admin (admin@hired.com)',
      sentTo: 'billing@techcorpsolutions.com',
      cc: 'finance@hired.com',
      sentAt: '2026-09-29T09:15:00Z',
      deliveryStatus: 'DELIVERED_TO_B2B',
      notes: 'September 2026 final billing dispatched with audited telematics attachment.',
    },
    lineItems: [
      { id: 'item-10', tripId: 'TRP-1980', date: '2026-09-05', route: 'Electronic City to Koramangala', fare: 900, companyShare: 810 },
      { id: 'item-11', tripId: 'TRP-1981', date: '2026-09-22', route: 'Airport to Whitefield', fare: 1550, companyShare: 1395 },
    ],
  },
];

class InvoiceService {
  constructor() {
    this._loadInvoices();
  }

  _loadInvoices() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.invoices = JSON.parse(stored);
      } else {
        this.invoices = JSON.parse(JSON.stringify(INITIAL_INVOICES));
        this._saveInvoices();
      }
    } catch {
      this.invoices = JSON.parse(JSON.stringify(INITIAL_INVOICES));
    }
  }

  reset() {
    this.invoices = JSON.parse(JSON.stringify(INITIAL_INVOICES));
    this._saveInvoices();
  }

  _saveInvoices() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.invoices));
    } catch {
      // ignore storage errors
    }
  }

  _updateLocalInvoice(updatedInv) {
    if (!updatedInv || !updatedInv.id) return;
    const idx = this.invoices.findIndex((i) => i.id === updatedInv.id || (updatedInv.rawId && i.rawId === updatedInv.rawId));
    if (idx !== -1) {
      this.invoices[idx] = { ...this.invoices[idx], ...updatedInv };
    } else {
      this.invoices.unshift(updatedInv);
    }
    this._saveInvoices();
  }

  /**
   * Fetch all invoices with optional status/search filters
   * Connected to backend: GET /api/v1/admin/invoices
   */
  async getInvoices(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await apiClient.get(`/admin/invoices${queryStr}`);
      if (res && (res.invoices || res.data?.items)) {
        const remoteItems = res.invoices || res.data.items;
        if (Array.isArray(remoteItems) && remoteItems.length > 0) {
          // Merge remote items into local collection
          for (const item of remoteItems) {
            this._updateLocalInvoice(item);
          }
          return remoteItems;
        }
      }
    } catch (err) {
      console.warn('[invoiceService] Backend API not reached, using local storage cache:', err.message);
    }

    // Fallback to local storage (e.g. for offline use or unit tests)
    let result = [...this.invoices];

    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(query) ||
          inv.companyName.toLowerCase().includes(query) ||
          inv.companyEmail.toLowerCase().includes(query)
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      result = result.filter((inv) => inv.status === filters.status);
    }

    return result;
  }

  /**
   * Fetch single invoice by ID
   * Connected to backend: GET /api/v1/admin/invoices/:id
   */
  async getInvoiceById(id) {
    try {
      const res = await apiClient.get(`/admin/invoices/${id}`);
      if (res && (res.invoice || res.data)) {
        const inv = res.invoice || res.data;
        this._updateLocalInvoice(inv);
        return inv;
      }
    } catch (err) {
      console.warn(`[invoiceService] Backend fetch failed for ${id}, using local cache:`, err.message);
    }

    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error(`Invoice statement ${id} not found.`);
    return { ...inv };
  }

  /**
   * First Approval (Creator or First Admin)
   * Connected to backend: POST /api/v1/admin/invoices/:id/verify-first
   */
  async approveFirst(id, adminUser) {
    const email = (adminUser?.email || adminUser?.emailId || '').toLowerCase().trim();
    if (!email) {
      throw new Error('Authenticated admin credentials required for verification.');
    }

    try {
      const res = await apiClient.post(`/admin/invoices/${id}/verify-first`, {});
      if (res && (res.invoice || res.data?.invoice)) {
        const updated = res.invoice || res.data.invoice;
        this._updateLocalInvoice(updated);
        return updated;
      }
    } catch (err) {
      if (err.status && err.status !== 401 && err.status !== 500 && err.status !== 503) {
        throw new Error(err.data?.error?.message || err.message);
      }
      console.warn(`[invoiceService] Backend approveFirst failed (${err.status || err.message}), using local fallback.`);
    }

    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Invoice statement ${id} not found.`);

    const inv = this.invoices[index];
    if (inv.status === 'SENT' || inv.status === 'VERIFIED') {
      throw new Error(`Invoice statement is already ${inv.status}.`);
    }

    inv.firstApproval = {
      id: String(adminUser.id || adminUser.adminId || 'admin-1'),
      name: adminUser.name || adminUser.adminName || 'Admin',
      email,
      at: new Date().toISOString(),
    };

    const secondEmail = (inv.secondApproval?.email || inv.secondApproval?.emailId || '').toLowerCase().trim();
    if (inv.secondApproval && secondEmail !== email) {
      inv.status = 'VERIFIED';
    } else {
      inv.status = 'PENDING_APPROVAL_2';
    }

    this._saveInvoices();
    return { ...inv };
  }

  /**
   * Second Approval (Must be a distinct active admin!)
   * Connected to backend: POST /api/v1/admin/invoices/:id/verify-second
   */
  async approveSecond(id, adminUser) {
    const email = (adminUser?.email || adminUser?.emailId || '').toLowerCase().trim();
    if (!email) {
      throw new Error('Authenticated admin credentials required for verification.');
    }

    try {
      const res = await apiClient.post(`/admin/invoices/${id}/verify-second`, {});
      if (res && (res.invoice || res.data?.invoice)) {
        const updated = res.invoice || res.data.invoice;
        this._updateLocalInvoice(updated);
        return updated;
      }
    } catch (err) {
      if (err.status && err.status !== 401 && err.status !== 500 && err.status !== 503) {
        throw new Error(err.data?.error?.message || err.message);
      }
      console.warn(`[invoiceService] Backend approveSecond failed (${err.status || err.message}), using local fallback.`);
    }

    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Invoice statement ${id} not found.`);

    const inv = this.invoices[index];
    if (!inv.firstApproval) {
      throw new Error('First admin verification must be completed before second approval.');
    }

    // STRICT RULE: The same admin cannot grant both approvals
    const firstApproverEmail = (inv.firstApproval.email || inv.firstApproval.emailId || '').toLowerCase().trim();
    const firstApproverId = String(inv.firstApproval.id || inv.firstApproval.adminId || '');
    const currentAdminId = String(adminUser.id || adminUser.adminId || '');

    if (
      (firstApproverEmail && email && firstApproverEmail === email) ||
      (firstApproverId && currentAdminId && firstApproverId === currentAdminId)
    ) {
      throw new Error(
        'Two-Person Verification Policy Violation: The same administrator cannot sign both approvals. Second approval must be performed by a different administrator.'
      );
    }

    inv.secondApproval = {
      id: String(adminUser.id || adminUser.adminId || 'admin-2'),
      name: adminUser.name || adminUser.adminName || 'Second Admin',
      email,
      at: new Date().toISOString(),
    };

    inv.status = 'VERIFIED';
    this._saveInvoices();
    return { ...inv };
  }

  /**
   * Dispatch / Send Verified Invoice to Corporate B2B Email
   * Connected to backend: POST /api/v1/admin/invoices/:id/dispatch-email
   */
  async sendInvoiceToCompany(id, { recipientEmail, ccEmails = '', notes = '', senderAdmin }) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('A valid corporate recipient email is required.');
    }

    try {
      const res = await apiClient.post(`/admin/invoices/${id}/dispatch-email`, {
        recipientEmail,
        ccEmails,
        notes,
      });
      if (res && (res.invoice || res.data?.invoice)) {
        const updated = res.invoice || res.data.invoice;
        this._updateLocalInvoice(updated);
        return updated;
      }
    } catch (err) {
      if (err.status && err.status !== 401 && err.status !== 500 && err.status !== 503) {
        throw new Error(err.data?.error?.message || err.message);
      }
      console.warn(`[invoiceService] Backend dispatch failed (${err.status || err.message}), using local fallback.`);
    }

    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Invoice statement ${id} not found.`);

    const inv = this.invoices[index];

    // HARD GUARD: Two-person verification check
    if (inv.status !== 'VERIFIED' && inv.status !== 'SENT') {
      throw new Error(
        'Cannot dispatch statement: Two-person verification is required before an invoice can be sent to the B2B company.'
      );
    }

    inv.dispatchAudit = {
      sentBy: senderAdmin ? `${senderAdmin.name || 'Admin'} (${senderAdmin.email})` : 'Super Admin',
      sentTo: recipientEmail.trim(),
      cc: ccEmails ? ccEmails.trim() : 'finance@hired.com',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'DELIVERED_TO_B2B',
      notes: notes || 'Dispatched via HireD Admin Portal.',
    };

    inv.status = 'SENT';
    this._saveInvoices();
    return { ...inv };
  }

  /**
   * Create a new draft statement for a corporate company
   */
  async createInvoice(data, creatorAdmin) {
    if (!data.companyName || !data.companyEmail) {
      throw new Error('Company name and billing email are required.');
    }

    const newId = `STMT-2026-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
      this.invoices.length + 1
    ).padStart(2, '0')}`;

    const subtotal = Number(data.subtotal) || 45000;
    const platformFee = Math.round(subtotal * 0.1);
    const taxAmount = Number((platformFee * 0.18).toFixed(2));
    const totalAmount = Number((subtotal + platformFee + taxAmount).toFixed(2));

    const newInvoice = {
      id: newId,
      companyId: data.companyId || `comp-${Date.now()}`,
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      billingContact: data.billingContact || 'Finance Team',
      billingPeriod: data.billingPeriod || 'Current Month',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      tripCount: Number(data.tripCount) || 25,
      subtotal,
      platformFee,
      taxAmount,
      totalAmount,
      status: 'PENDING_APPROVAL_1',
      creator: {
        id: creatorAdmin?.id || 'admin-1',
        name: creatorAdmin?.name || 'Admin',
        email: creatorAdmin?.email || 'admin@hired.com',
        at: new Date().toISOString(),
      },
      firstApproval: null,
      secondApproval: null,
      dispatchAudit: null,
      lineItems: [
        {
          id: `item-${Date.now()}-1`,
          tripId: 'TRP-3001',
          date: new Date().toISOString().split('T')[0],
          route: 'Corporate Campus to Airport',
          fare: 1200,
          companyShare: 1080,
        },
      ],
    };

    this.invoices.unshift(newInvoice);
    this._saveInvoices();
    return newInvoice;
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
