/**
 * Month-End Statement Service
 * Implements PRD B-06 and database_updated0.2.md Section 5.4 & 10.1
 * - Exposes ONLY statements with status = 'PUBLISHED'
 * - Displays dual-admin verification trail and month-end settlement totals
 */

import apiClient from './apiClient';
import { MOCK_COMPANY } from './mockData';

// Mock seed of statements covering different months and verification states
const MOCK_INVOICES_STORE = [
  {
    invoice_id: 801,
    invoice_number: 'INV-2026-09-101',
    company_id: 101,
    period_month: '2026-09',
    status: 'PUBLISHED', // Accessible by partner
    total_trips: 18,
    total_amount: 42500.0,
    expenses_total: 2150.0,
    net_payable: 44650.0,
    created_at: '2026-10-01T09:00:00Z',
    verified_by_admin1: 'ADM-01 (Rajeev N. - Operations Lead)',
    verified_at1: '2026-10-01T15:30:00Z',
    verified_by_admin2: 'ADM-02 (Sneha K. - Finance Manager)',
    verified_at2: '2026-10-02T10:00:00Z',
    published_at: '2026-10-02T10:05:00Z',
    payment_status: 'UNPAID', // Unpaid/settled offline as per PRD
    settlement_terms: 'Direct corporate settlement via NEFT/RTGS within 15 business days of publication.',
    trips: [
      {
        trip_id: 980,
        closed_at: '2026-09-28T10:20:00Z',
        pickup_spot: 'Sector 29 Market, Gurugram',
        dropoff_spot: 'Greater Kailash 1, South Delhi',
        amount: 2400.0,
      },
      {
        trip_id: 975,
        closed_at: '2026-09-25T15:42:00Z',
        pickup_spot: 'Ambience Mall, Gurugram',
        dropoff_spot: 'Aerocity, New Delhi',
        amount: 1650.0,
      },
      {
        trip_id: 971,
        closed_at: '2026-09-24T18:10:00Z',
        pickup_spot: 'Cyber City, Gurugram',
        dropoff_spot: 'Noida Sector 62',
        amount: 2850.0,
      },
    ],
  },
  {
    invoice_id: 792,
    invoice_number: 'INV-2026-08-101',
    company_id: 101,
    period_month: '2026-08',
    status: 'PUBLISHED', // Accessible by partner
    total_trips: 15,
    total_amount: 36200.0,
    expenses_total: 1400.0,
    net_payable: 37600.0,
    created_at: '2026-09-01T08:30:00Z',
    verified_by_admin1: 'ADM-01 (Rajeev N. - Operations Lead)',
    verified_at1: '2026-09-01T14:15:00Z',
    verified_by_admin2: 'ADM-03 (Ananya V. - Senior Controller)',
    verified_at2: '2026-09-02T11:20:00Z',
    published_at: '2026-09-02T11:25:00Z',
    payment_status: 'PAID',
    settlement_terms: 'Direct corporate settlement via NEFT/RTGS within 15 business days of publication.',
    trips: [],
  },
  // INVOICE IN DRAFT / PENDING_VERIFICATION (MUST BE EXCLUDED FROM PARTNER ACCESS)
  {
    invoice_id: 815,
    invoice_number: 'INV-2026-10-101',
    company_id: 101,
    period_month: '2026-10',
    status: 'PENDING_VERIFICATION', // Only verified by Admin 1, awaiting Admin 2
    total_trips: 8,
    total_amount: 19400.0,
    verified_by_admin1: 'ADM-01',
    verified_by_admin2: null,
  },
];

export const statementService = {
  /**
   * Get all published statements for the partner company
   * Enforces PRD B-06 security rule: only PUBLISHED statements are returned.
   */
  async getPublishedStatements() {
    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Filter out any DRAFT, PENDING_VERIFICATION, or VERIFIED statements
      return MOCK_INVOICES_STORE.filter(
        (inv) => inv.company_id === MOCK_COMPANY.company_id && inv.status === 'PUBLISHED'
      );
    }

    const response = await apiClient.get('/invoices?status=PUBLISHED');
    return response.data.invoices || response.data;
  },

  /**
   * Get detail of a specific published statement
   */
  async getStatementDetail(invoiceId) {
    const statements = await this.getPublishedStatements();
    const statement = statements.find((s) => s.invoice_id === Number(invoiceId));
    if (!statement) {
      throw new Error('Statement not found or not yet approved for publication by administrators.');
    }
    return statement;
  },
};

export default statementService;
