import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';

/**
 * Format invoice entity for partner statement view.
 * Enforces PRD B-06 data contract.
 */
export function formatPartnerInvoiceResponse(invoice) {
  if (!invoice) return null;

  const totalTrips = invoice.tripPayrolls ? invoice.tripPayrolls.length : 0;
  let expensesTotal = 0;

  const tripItems = (invoice.tripPayrolls || []).map((p) => {
    const tripExpenses = (p.trip?.expenses || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    expensesTotal += tripExpenses;

    return {
      trip_id: p.tripId,
      closed_at: p.trip?.closedAt ? p.trip.closedAt.toISOString() : null,
      pickup_spot: p.trip?.order?.pickupSpot || 'N/A',
      dropoff_spot: p.trip?.order?.dropoffSpot || 'N/A',
      amount: Number(p.tripAmount || 0).toFixed(2),
      driver_share: Number(p.driverShare || 0).toFixed(2),
      platform_share: Number(p.companyShare || 0).toFixed(2)
    };
  });

  const totalAmt = Number(invoice.totalAmount || 0);
  const netPayable = (totalAmt + expensesTotal).toFixed(2);

  return {
    invoice_id: invoice.invoiceId,
    invoice_number: `INV-${invoice.periodMonth}-${invoice.companyId}`,
    company_id: invoice.companyId,
    period_month: invoice.periodMonth,
    status: invoice.status,
    total_trips: totalTrips,
    total_amount: totalAmt.toFixed(2),
    driver_share_pct: Number(invoice.company?.driverSplit || 30.00).toFixed(2),
    platform_share_pct: Number(invoice.company?.hiredSplit || 70.00).toFixed(2),
    driver_share_total: Number(invoice.totalDriverShare || 0).toFixed(2),
    platform_share_total: Number(invoice.totalCompanyShare || 0).toFixed(2),
    expenses_total: expensesTotal.toFixed(2),
    net_payable: netPayable,
    created_at: invoice.createdAt ? invoice.createdAt.toISOString() : null,
    verified_by_admin1: invoice.verifierAdmin1
      ? `ADM-${invoice.verifierAdmin1.adminId} (${invoice.verifierAdmin1.adminName})`
      : null,
    verified_at1: invoice.verifiedAt1 ? invoice.verifiedAt1.toISOString() : null,
    verified_by_admin2: invoice.verifierAdmin2
      ? `ADM-${invoice.verifierAdmin2.adminId} (${invoice.verifierAdmin2.adminName})`
      : null,
    verified_at2: invoice.verifiedAt2 ? invoice.verifiedAt2.toISOString() : null,
    published_at: invoice.publishedAt ? invoice.publishedAt.toISOString() : null,
    payment_status: 'UNPAID',
    settlement_terms: 'Direct corporate settlement via NEFT/RTGS within 15 business days of publication.',
    trips: tripItems
  };
}

/**
 * List published month-end statements for a partner company.
 * Strictly filters out any draft or unverified invoices (PRD B-06).
 */
export async function listPartnerInvoices(companyId, { page = 1, limit = 50 } = {}) {
  const where = {
    companyId: Number(companyId),
    status: 'PUBLISHED'
  };

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        company: true,
        creatorAdmin: true,
        verifierAdmin1: true,
        verifierAdmin2: true,
        tripPayrolls: {
          include: {
            trip: {
              include: {
                order: true,
                expenses: true
              }
            }
          }
        }
      },
      orderBy: { periodMonth: 'desc' },
      skip,
      take
    })
  ]);

  const formatted = invoices.map(formatPartnerInvoiceResponse);
  return {
    items: formatted,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Retrieve a single published statement for a partner company.
 */
export async function getPartnerInvoiceDetail(companyId, invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      invoiceId: Number(invoiceId),
      companyId: Number(companyId),
      status: 'PUBLISHED' // Strictly accessible only when PUBLISHED
    },
    include: {
      company: true,
      creatorAdmin: true,
      verifierAdmin1: true,
      verifierAdmin2: true,
      tripPayrolls: {
        include: {
          trip: {
            include: {
              order: true,
              expenses: true
            }
          }
        }
      }
    }
  });

  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Statement not found or not yet approved for publication by administrators.');
  }

  return formatPartnerInvoiceResponse(invoice);
}
