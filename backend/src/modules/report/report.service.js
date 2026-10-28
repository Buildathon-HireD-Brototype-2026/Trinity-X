import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';

/**
 * Format closed trip for partner report.
 * Strictly excludes driver margin/split (only revealed in PUBLISHED invoices per PRD B-05).
 */
export function formatPartnerTripReport(trip) {
  if (!trip) return null;

  const expensesList = (trip.expenses || []).map((e) => ({
    expense_id: e.expenseId,
    description: e.description,
    amount: Number(e.amount).toFixed(2)
  }));

  const expensesTotal = expensesList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const tripAmount = Number(trip.amount || 0);
  const totalSpend = (tripAmount + expensesTotal).toFixed(2);

  return {
    trip_id: trip.tripId,
    order_id: trip.orderId,
    pickup_spot: trip.order ? trip.order.pickupSpot : 'N/A',
    dropoff_spot: trip.order ? trip.order.dropoffSpot : 'N/A',
    pickup_latitude: trip.pickupLatitude !== null && trip.pickupLatitude !== undefined ? Number(trip.pickupLatitude) : (trip.order?.pickupLatitude ? Number(trip.order.pickupLatitude) : null),
    pickup_longitude: trip.pickupLongitude !== null && trip.pickupLongitude !== undefined ? Number(trip.pickupLongitude) : (trip.order?.pickupLongitude ? Number(trip.order.pickupLongitude) : null),
    drop_latitude: trip.dropLatitude !== null && trip.dropLatitude !== undefined ? Number(trip.dropLatitude) : (trip.order?.dropLatitude ? Number(trip.order.dropLatitude) : null),
    drop_longitude: trip.dropLongitude !== null && trip.dropLongitude !== undefined ? Number(trip.dropLongitude) : (trip.order?.dropLongitude ? Number(trip.order.dropLongitude) : null),
    pickupLatitude: trip.pickupLatitude !== null && trip.pickupLatitude !== undefined ? Number(trip.pickupLatitude) : (trip.order?.pickupLatitude ? Number(trip.order.pickupLatitude) : null),
    pickupLongitude: trip.pickupLongitude !== null && trip.pickupLongitude !== undefined ? Number(trip.pickupLongitude) : (trip.order?.pickupLongitude ? Number(trip.order.pickupLongitude) : null),
    dropLatitude: trip.dropLatitude !== null && trip.dropLatitude !== undefined ? Number(trip.dropLatitude) : (trip.order?.dropLatitude ? Number(trip.order.dropLatitude) : null),
    dropLongitude: trip.dropLongitude !== null && trip.dropLongitude !== undefined ? Number(trip.dropLongitude) : (trip.order?.dropLongitude ? Number(trip.order.dropLongitude) : null),
    pickup_time: trip.order?.pickupTime ? trip.order.pickupTime.toISOString() : null,
    contact_name: trip.order ? trip.order.contactName : 'N/A',
    contact_phone: trip.order ? trip.order.contactPhone : 'N/A',
    driver_name: trip.driver ? trip.driver.name : 'Partner Driver',
    driver_phone: trip.driver ? trip.driver.phoneNo : '',
    started_at: trip.startedAt ? trip.startedAt.toISOString() : null,
    closed_at: trip.closedAt ? trip.closedAt.toISOString() : null,
    startSelfieUrl: trip.startSelfieUrl || trip.selfieURL || null,
    startSelfieUploadedAt: trip.startSelfieUploadedAt ? trip.startSelfieUploadedAt.toISOString() : null,
    startSelfieDeletedAt: trip.startSelfieDeletedAt ? trip.startSelfieDeletedAt.toISOString() : null,
    amount: tripAmount.toFixed(2),
    expenses: expensesList,
    expenses_total: expensesTotal.toFixed(2),
    total_spend: totalSpend,
    company_id: trip.order ? trip.order.companyId : null
  };
}

/**
 * List closed trip reports for a partner company.
 */
export async function listPartnerTripReports(companyId, { page = 1, limit = 50 } = {}) {
  const where = {
    order: {
      companyId: Number(companyId)
    },
    tripStatus: 'CLOSED'
  };

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: {
        order: true,
        driver: true,
        expenses: true
      },
      orderBy: { closedAt: 'desc' },
      skip,
      take
    })
  ]);

  const formatted = trips.map(formatPartnerTripReport);
  return {
    items: formatted,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Get single closed trip report for a partner company.
 */
export async function getPartnerTripReport(companyId, tripId) {
  const trip = await prisma.trip.findFirst({
    where: {
      tripId: Number(tripId),
      order: {
        companyId: Number(companyId)
      }
    },
    include: {
      order: true,
      driver: true,
      expenses: true
    }
  });

  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'Trip report not found.');
  }

  if (trip.tripStatus !== 'CLOSED') {
    throw new AppError(409, 'TRIP_NOT_CLOSED', 'The trip is not CLOSED yet.');
  }

  return formatPartnerTripReport(trip);
}
