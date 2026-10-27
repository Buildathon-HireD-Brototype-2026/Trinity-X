import crypto from 'crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';

/**
 * Format order entity for API responses (both B2B Portal and OpenAPI specs).
 */
export function formatOrderResponse(order) {
  if (!order) return null;

  const tripObj = order.trip ? {
    trip_id: order.trip.tripId,
    order_id: order.orderId,
    status: order.trip.tripStatus,
    trip_status: order.trip.tripStatus,
    amount: Number(order.trip.amount).toFixed(2),
    eta: order.trip.eta ? order.trip.eta.toISOString() : null,
    otp: order.trip.otp,
    driver_id: order.trip.driverId || null,
    driver_name: order.trip.driver ? order.trip.driver.name : null,
    driver_phone: order.trip.driver ? order.trip.driver.phoneNo : null,
    selfie_url: order.trip.startSelfieUrl || order.trip.selfieURL || null,
    startSelfieUrl: order.trip.startSelfieUrl || order.trip.selfieURL || null,
    startSelfieUploadedAt: order.trip.startSelfieUploadedAt ? order.trip.startSelfieUploadedAt.toISOString() : null,
    startSelfieDeletedAt: order.trip.startSelfieDeletedAt ? order.trip.startSelfieDeletedAt.toISOString() : null,
    startSelfieExpiresAt: order.trip.startSelfieExpiresAt ? order.trip.startSelfieExpiresAt.toISOString() : null,
    created_at: order.trip.createdAt ? order.trip.createdAt.toISOString() : null
  } : null;

  return {
    order_id: order.orderId,
    company_id: order.companyId,
    company_name: order.company ? order.company.name : undefined,
    pickup_spot: order.pickupSpot,
    dropoff_spot: order.dropoffSpot,
    pickup_time: order.pickupTime ? order.pickupTime.toISOString() : null,
    contact_name: order.contactName,
    contact_phone: order.contactPhone,
    notes: order.notes || null,
    status: order.status,
    source: order.source,
    reject_reason: order.rejectReason || null,
    version: order.version,
    created_at: order.createdAt ? order.createdAt.toISOString() : null,
    updated_at: order.updatedAt ? order.updatedAt.toISOString() : null,
    trip: tripObj,
    trip_id: tripObj ? tripObj.trip_id : null
  };
}

/**
 * List orders for a specific partner company (tenant-isolated).
 */
export async function listPartnerOrders(companyId, { status, page = 1, limit = 50 } = {}) {
  const where = {
    companyId: Number(companyId)
  };

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        company: true,
        trip: {
          include: {
            driver: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })
  ]);

  const formatted = orders.map(formatOrderResponse);
  return {
    items: formatted,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Partner creates a new transport order.
 */
export async function createPartnerOrder(companyId, payload) {
  const { pickup_spot, dropoff_spot, pickup_time, contact_name, contact_phone, notes } = payload;

  const errors = [];
  if (!pickup_spot || !pickup_spot.trim()) {
    errors.push({ field: 'pickup_spot', message: 'Pickup location is required.' });
  }
  if (!dropoff_spot || !dropoff_spot.trim()) {
    errors.push({ field: 'dropoff_spot', message: 'Drop-off location is required.' });
  }
  if (!pickup_time) {
    errors.push({ field: 'pickup_time', message: 'Pickup time is required.' });
  } else {
    const d = new Date(pickup_time);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'pickup_time', message: 'Invalid pickup time format.' });
    }
  }
  if (!contact_name || !contact_name.trim()) {
    errors.push({ field: 'contact_name', message: 'Contact name is required.' });
  }
  if (!contact_phone || !contact_phone.trim()) {
    errors.push({ field: 'contact_phone', message: 'Contact phone is required.' });
  }
  if (notes && typeof notes === 'string' && notes.length > 1000) {
    errors.push({ field: 'notes', message: 'Notes cannot exceed 1000 characters.' });
  }

  if (errors.length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Order validation failed.', errors);
  }

  // Verify company is active
  const company = await prisma.company.findUnique({
    where: { companyId: Number(companyId) }
  });

  if (!company || company.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Company account is not active.');
  }

  const order = await prisma.order.create({
    data: {
      companyId: Number(companyId),
      pickupSpot: pickup_spot.trim(),
      dropoffSpot: dropoff_spot.trim(),
      pickupTime: new Date(pickup_time),
      contactName: contact_name.trim(),
      contactPhone: contact_phone.trim(),
      notes: notes ? notes.trim() : null,
      status: 'RECEIVED',
      source: 'PORTAL'
    },
    include: {
      company: true,
      trip: true
    }
  });

  return formatOrderResponse(order);
}

/**
 * Retrieve a single order for a partner company (tenant-isolated).
 */
export async function getPartnerOrder(companyId, orderId) {
  const order = await prisma.order.findFirst({
    where: {
      orderId: Number(orderId),
      companyId: Number(companyId)
    },
    include: {
      company: true,
      trip: {
        include: {
          driver: true
        }
      }
    }
  });

  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found.');
  }

  return formatOrderResponse(order);
}

/**
 * Admin order listing with search and filters.
 */
export async function listAdminOrders({ status, source, company_id, page = 1, limit = 50 } = {}) {
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status.toUpperCase();
  }
  if (source) {
    where.source = source.toUpperCase();
  }
  if (company_id) {
    where.companyId = Number(company_id);
  }

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        company: true,
        trip: {
          include: {
            driver: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })
  ]);

  const formatted = orders.map(formatOrderResponse);
  return {
    items: formatted,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Admin accepts an order and generates unassigned trip with 6-digit OTP.
 */
export async function acceptOrder(orderId, adminId, { amount, eta, version } = {}, ipAddress) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderId: Number(orderId) },
      include: { company: true, trip: true }
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    }

    if (order.status !== 'RECEIVED') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order was already decided or has changed.');
    }

    if (version !== undefined && version !== null && order.version !== Number(version)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order version mismatch. Please reload and retry.');
    }

    if (amount !== undefined && amount !== null && amount !== '') {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
        throw new AppError(422, 'VALIDATION_ERROR', 'Trip amount must be a positive number between 1 and 1,000,000.', [
          { field: 'amount', message: 'must be a positive number between 1 and 1,000,000' }
        ]);
      }
    }

    const tripAmount = amount ? Number(amount) : 1200.00;
    const tripEta = eta ? new Date(eta) : new Date(order.pickupTime);
    // Generate 6-digit cryptographically secure random numeric OTP (CWE-330 / CWE-338 hardened)
    const generatedOtp = String(crypto.randomInt(100000, 1000000));

    // Atomic conditional update preventing race conditions
    const updateResult = await tx.order.updateMany({
      where: { orderId: order.orderId, status: 'RECEIVED' },
      data: {
        status: 'ACCEPTED',
        decidedByAdminId: Number(adminId),
        decidedAt: new Date(),
        version: { increment: 1 }
      }
    });

    if (updateResult.count === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order was already decided or has changed.');
    }

    const updatedOrder = await tx.order.findUnique({
      where: { orderId: order.orderId },
      include: { company: true }
    });

    // Create unassigned trip
    const trip = await tx.trip.create({
      data: {
        orderId: order.orderId,
        amount: tripAmount,
        eta: tripEta,
        otp: generatedOtp,
        tripStatus: 'UNASSIGNED'
      }
    });

    // Send in-app notification to partner
    await tx.notification.create({
      data: {
        recipientType: 'PARTNER',
        recipientId: order.companyId,
        recipientEmail: order.company.emailId,
        type: 'ORDER_ACCEPTED',
        entityType: 'ORDER',
        entityId: order.orderId,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    // Record audit log
    await recordAuditLog(tx, {
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ORDER_ACCEPTED',
      entityType: 'ORDER',
      entityId: order.orderId,
      oldValue: { status: 'RECEIVED' },
      newValue: { status: 'ACCEPTED', tripId: trip.tripId, amount: tripAmount },
      ipAddress
    });

    const formattedOrder = formatOrderResponse({ ...updatedOrder, trip });
    return {
      order: formattedOrder,
      trip: {
        trip_id: trip.tripId,
        order_id: trip.orderId,
        status: trip.tripStatus,
        trip_status: trip.tripStatus,
        amount: Number(trip.amount).toFixed(2),
        eta: trip.eta ? trip.eta.toISOString() : null,
        otp: trip.otp
      }
    };
  });
}

/**
 * Admin rejects an order with mandatory reason.
 */
export async function rejectOrder(orderId, adminId, { reason, reject_reason, version } = {}, ipAddress) {
  const rejectionReason = (reason || reject_reason || '').trim();
  if (!rejectionReason || rejectionReason.length < 3) {
    throw new AppError(422, 'VALIDATION_ERROR', 'A valid rejection reason (minimum 3 characters) is required.', [
      { field: 'reason', message: 'Rejection reason is required.' }
    ]);
  }
  if (rejectionReason.length > 500) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Rejection reason cannot exceed 500 characters.', [
      { field: 'reason', message: 'Rejection reason cannot exceed 500 characters.' }
    ]);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderId: Number(orderId) },
      include: { company: true }
    });

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    }

    if (order.status !== 'RECEIVED') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order was already decided or has changed.');
    }

    if (version !== undefined && version !== null && order.version !== Number(version)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order version mismatch. Please reload and retry.');
    }

    // Atomic conditional update preventing race conditions
    const updateResult = await tx.order.updateMany({
      where: { orderId: order.orderId, status: 'RECEIVED' },
      data: {
        status: 'REJECTED',
        rejectReason: rejectionReason,
        decidedByAdminId: Number(adminId),
        decidedAt: new Date(),
        version: { increment: 1 }
      }
    });

    if (updateResult.count === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Order was already decided or has changed.');
    }

    const updatedOrder = await tx.order.findUnique({
      where: { orderId: order.orderId },
      include: { company: true }
    });

    await tx.notification.create({
      data: {
        recipientType: 'PARTNER',
        recipientId: order.companyId,
        recipientEmail: order.company.emailId,
        type: 'ORDER_REJECTED',
        entityType: 'ORDER',
        entityId: order.orderId,
        status: 'SENT',
        sentAt: new Date(),
        lastError: rejectionReason
      }
    });

    await recordAuditLog(tx, {
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ORDER_REJECTED',
      entityType: 'ORDER',
      entityId: order.orderId,
      oldValue: { status: 'RECEIVED' },
      newValue: { status: 'REJECTED', reason: rejectionReason },
      reason: rejectionReason,
      ipAddress
    });

    return formatOrderResponse(updatedOrder);
  });
}

/**
 * Admin assigns an active driver to a trip.
 */
export async function assignDriverToTrip(tripId, adminId, { driver_id, driverId, version } = {}, ipAddress) {
  const targetDriverId = Number(driver_id || driverId);
  if (!targetDriverId || isNaN(targetDriverId)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Valid driver_id is required.');
  }

  return prisma.$transaction(async (tx) => {
    const [trip, driver] = await Promise.all([
      tx.trip.findUnique({
        where: { tripId: Number(tripId) },
        include: { order: true }
      }),
      tx.driver.findUnique({
        where: { driverId: targetDriverId }
      })
    ]);

    if (!trip) {
      throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
    }

    if (trip.tripStatus === 'CLOSED') {
      throw new AppError(409, 'CONFLICT', 'Cannot assign driver to a CLOSED trip.');
    }

    if (version !== undefined && version !== null && trip.version !== Number(version)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Trip version mismatch. Please reload.');
    }

    if (!driver || driver.status !== 'ACTIVE') {
      throw new AppError(422, 'DRIVER_NOT_ACTIVE', 'Only ACTIVE drivers can be assigned to trips.');
    }

    // Check if driver is on leave on pickup date
    const pickupDate = trip.order.pickupTime;
    const warnings = [];
    const onLeave = await tx.driverLeave.findFirst({
      where: {
        driverId: targetDriverId,
        startDate: { lte: pickupDate },
        endDate: { gte: pickupDate }
      }
    });

    if (onLeave) {
      warnings.push('DRIVER_ON_LEAVE');
    }

    const updatedTrip = await tx.trip.update({
      where: { tripId: trip.tripId },
      data: {
        driverId: targetDriverId,
        tripStatus: 'ASSIGNED',
        assignedAt: new Date(),
        version: { increment: 1 }
      },
      include: {
        driver: true,
        order: {
          include: {
            company: true
          }
        }
      }
    });

    await recordAuditLog(tx, {
      actorId: adminId,
      actorType: 'ADMIN',
      action: trip.driverId ? 'DRIVER_REASSIGNED' : 'DRIVER_ASSIGNED',
      entityType: 'TRIP',
      entityId: trip.tripId,
      oldValue: { driverId: trip.driverId, tripStatus: trip.tripStatus },
      newValue: { driverId: targetDriverId, tripStatus: 'ASSIGNED' },
      ipAddress
    });

    return {
      trip: {
        trip_id: updatedTrip.tripId,
        order_id: updatedTrip.orderId,
        driver_id: updatedTrip.driverId,
        driver_name: updatedTrip.driver.name,
        driver_phone: updatedTrip.driver.phoneNo,
        status: updatedTrip.tripStatus,
        trip_status: updatedTrip.tripStatus,
        amount: Number(updatedTrip.amount).toFixed(2),
        eta: updatedTrip.eta ? updatedTrip.eta.toISOString() : null,
        assigned_at: updatedTrip.assignedAt ? updatedTrip.assignedAt.toISOString() : null
      },
      warnings
    };
  });
}
