import crypto from 'crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../shared/response.js';
import { recordAuditLog } from '../../shared/audit.js';
import { sendOrderDecisionEmail } from '../../shared/email.service.js';

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
 * Compute calendar day bounds in a specific timezone (Asia/Kolkata by default).
 * Returns:
 * - dateStr: 'YYYY-MM-DD'
 * - calendarDateUtc: Date object at 00:00:00.000 UTC for the date (matches Prisma @db.Date)
 * - startOfDayUtc: UTC Date for 00:00:00.000 local time
 * - endOfDayUtc: UTC Date for 23:59:59.999 local time
 */
export function getCalendarDayBounds(dateInput, timeZone = 'Asia/Kolkata') {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid date format provided.');
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(d); // 'YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // UTC midnight date for @db.Date matching in Prisma
  const calendarDateUtc = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  // Asia/Kolkata is UTC+05:30 (no DST)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const startOfDayUtc = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  const endOfDayUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return {
    dateStr,
    calendarDateUtc,
    startOfDayUtc,
    endOfDayUtc
  };
}

/**
 * Retrieve drivers eligible for an order on its scheduled pickup date.
 * Enforces:
 * 1. driver.status === 'ACTIVE'
 * 2. No approved leave on the order calendar day
 * 3. No other assigned/ongoing trip on the same calendar day (excluding this order's trip)
 * Executes as a SINGLE query with Prisma relation filters.
 */
export async function getEligibleDriversForOrder(orderId, dateOverride) {
  const numericOrderId = Number(orderId);
  if (!numericOrderId || isNaN(numericOrderId)) {
    throw new AppError(400, 'INVALID_PARAM', 'Invalid order_id.');
  }

  let order = null;
  if (numericOrderId > 0) {
    order = await prisma.order.findUnique({
      where: { orderId: numericOrderId }
    });
  }

  const targetDate = dateOverride || (order ? order.pickupTime : null);
  if (!targetDate) {
    throw new AppError(404, 'NOT_FOUND', 'Order or valid date not found to determine driver availability.');
  }

  const { calendarDateUtc, startOfDayUtc, endOfDayUtc, dateStr } = getCalendarDayBounds(targetDate, 'Asia/Kolkata');

  const eligibleDrivers = await prisma.driver.findMany({
    where: {
      status: 'ACTIVE',
      // Condition 2: No approved leave covering the order date
      leaves: {
        none: {
          status: { in: ['APPROVED', 'approved'] },
          startDate: { lte: calendarDateUtc },
          endDate: { gte: calendarDateUtc }
        }
      },
      // Condition 3: No other assigned/ongoing trip on the same calendar day
      trips: {
        none: {
          orderId: { not: numericOrderId },
          tripStatus: { in: ['ASSIGNED', 'ONGOING'] },
          order: {
            pickupTime: {
              gte: startOfDayUtc,
              lte: endOfDayUtc
            }
          }
        }
      }
    },
    select: {
      driverId: true,
      name: true,
      phoneNo: true,
      status: true,
      currentLocation: true,
      isOnline: true
    },
    orderBy: { name: 'asc' }
  });

  return eligibleDrivers.map(d => ({
    id: `DRV-${d.driverId}`,
    driver_id: d.driverId,
    name: d.name,
    phone_no: d.phoneNo,
    phone: d.phoneNo,
    status: d.status,
    current_location: d.currentLocation || null,
    is_online: Boolean(d.isOnline),
    checked_date: dateStr
  }));
}

/**
 * Admin accepts an order and generates trip with 6-digit OTP, optionally assigning an eligible driver.
 */
export async function acceptOrder(orderId, adminId, { amount, eta, version, driver_id, driverId, driverName } = {}, ipAddress) {
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

    // Resolve driver if specified during accept
    let assignedDriver = null;
    let targetDriverId = driver_id || driverId;
    if (typeof targetDriverId === 'string' && targetDriverId.startsWith('DRV-')) {
      targetDriverId = parseInt(targetDriverId.replace('DRV-', ''), 10);
    } else if (targetDriverId) {
      targetDriverId = Number(targetDriverId);
    }

    if (!targetDriverId && driverName) {
      const foundDriver = await tx.driver.findFirst({
        where: { name: driverName.trim() }
      });
      if (foundDriver) targetDriverId = foundDriver.driverId;
    }

    if (targetDriverId) {
      assignedDriver = await tx.driver.findUnique({
        where: { driverId: targetDriverId }
      });

      if (!assignedDriver || assignedDriver.status !== 'ACTIVE') {
        throw new AppError(400, 'DRIVER_NOT_ACTIVE', 'Only ACTIVE drivers can be assigned to trips.');
      }

      const { calendarDateUtc, startOfDayUtc, endOfDayUtc } = getCalendarDayBounds(order.pickupTime, 'Asia/Kolkata');

      // Rule 2: Check approved leave conflict
      const leaveConflict = await tx.driverLeave.findFirst({
        where: {
          driverId: targetDriverId,
          status: { in: ['APPROVED', 'approved'] },
          startDate: { lte: calendarDateUtc },
          endDate: { gte: calendarDateUtc }
        }
      });
      if (leaveConflict) {
        throw new AppError(409, 'DRIVER_CONFLICT', 'Driver is on approved leave on this date. Please pick another driver.');
      }

      // Rule 3: Check conflicting trip on same day
      const tripConflict = await tx.trip.findFirst({
        where: {
          driverId: targetDriverId,
          orderId: { not: order.orderId },
          tripStatus: { in: ['ASSIGNED', 'ONGOING'] },
          order: {
            pickupTime: {
              gte: startOfDayUtc,
              lte: endOfDayUtc
            }
          }
        }
      });
      if (tripConflict) {
        throw new AppError(409, 'DRIVER_CONFLICT', 'Driver is already assigned to another trip on this date. Please pick another driver.');
      }
    }

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

    // Create trip (ASSIGNED if driver allocated, else UNASSIGNED)
    const trip = await tx.trip.create({
      data: {
        orderId: order.orderId,
        driverId: assignedDriver ? assignedDriver.driverId : null,
        amount: tripAmount,
        eta: tripEta,
        otp: generatedOtp,
        tripStatus: assignedDriver ? 'ASSIGNED' : 'UNASSIGNED',
        assignedAt: assignedDriver ? new Date() : null
      },
      include: {
        driver: true
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

    // Transmit real email notification to B2B corporate client
    try {
      await sendOrderDecisionEmail({
        to: order.company.emailId,
        companyName: order.company.name,
        orderId: order.orderId,
        status: 'ACCEPTED',
        pickupSpot: order.pickupSpot,
        dropoffSpot: order.dropoffSpot,
        pickupTime: order.pickupTime,
        fare: tripAmount,
        passengerName: order.contactName,
        passengerPhone: order.contactPhone,
        driverName: assignedDriver ? assignedDriver.name : undefined,
        driverPhone: assignedDriver ? assignedDriver.phoneNo : undefined
      });
    } catch (mailErr) {
      console.error('[order-accept] Email dispatch warning:', mailErr.message);
    }

    // Record audit log
    await recordAuditLog(tx, {
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ORDER_ACCEPTED',
      entityType: 'ORDER',
      entityId: order.orderId,
      oldValue: { status: 'RECEIVED' },
      newValue: {
        status: 'ACCEPTED',
        tripId: trip.tripId,
        amount: tripAmount,
        driverId: assignedDriver ? assignedDriver.driverId : null
      },
      ipAddress
    });

    const formattedOrder = formatOrderResponse({ ...updatedOrder, trip });
    return {
      order: formattedOrder,
      trip: {
        trip_id: trip.tripId,
        order_id: trip.orderId,
        driver_id: trip.driverId || null,
        driver_name: trip.driver ? trip.driver.name : null,
        driver_phone: trip.driver ? trip.driver.phoneNo : null,
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

    // Transmit real decline notification email to B2B corporate client
    try {
      await sendOrderDecisionEmail({
        to: order.company.emailId,
        companyName: order.company.name,
        orderId: order.orderId,
        status: 'REJECTED',
        pickupSpot: order.pickupSpot,
        dropoffSpot: order.dropoffSpot,
        pickupTime: order.pickupTime,
        rejectReason: rejectionReason,
        passengerName: order.contactName,
        passengerPhone: order.contactPhone
      });
    } catch (mailErr) {
      console.error('[order-reject] Email dispatch warning:', mailErr.message);
    }

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
  let targetDriverId = driver_id || driverId;
  if (typeof targetDriverId === 'string' && targetDriverId.startsWith('DRV-')) {
    targetDriverId = parseInt(targetDriverId.replace('DRV-', ''), 10);
  } else {
    targetDriverId = Number(targetDriverId);
  }

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

    // Rule 1: Driver must be active
    if (!driver || driver.status !== 'ACTIVE') {
      throw new AppError(400, 'DRIVER_NOT_ACTIVE', 'Only ACTIVE drivers can be assigned to trips.');
    }

    const { calendarDateUtc, startOfDayUtc, endOfDayUtc } = getCalendarDayBounds(trip.order.pickupTime, 'Asia/Kolkata');

    // Rule 2: Check approved leave on pickup date
    const leaveConflict = await tx.driverLeave.findFirst({
      where: {
        driverId: targetDriverId,
        status: { in: ['APPROVED', 'approved'] },
        startDate: { lte: calendarDateUtc },
        endDate: { gte: calendarDateUtc }
      }
    });

    if (leaveConflict) {
      throw new AppError(409, 'DRIVER_CONFLICT', 'Driver is on approved leave on this date. Please pick another driver.');
    }

    // Rule 3: Check conflicting trip on same calendar day
    const tripConflict = await tx.trip.findFirst({
      where: {
        driverId: targetDriverId,
        tripId: { not: trip.tripId },
        orderId: { not: trip.orderId },
        tripStatus: { in: ['ASSIGNED', 'ONGOING'] },
        order: {
          pickupTime: {
            gte: startOfDayUtc,
            lte: endOfDayUtc
          }
        }
      }
    });

    if (tripConflict) {
      throw new AppError(409, 'DRIVER_CONFLICT', 'Driver is already assigned to another trip on this date. Please pick another driver.');
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
        driver_name: updatedTrip.driver ? updatedTrip.driver.name : null,
        driver_phone: updatedTrip.driver ? updatedTrip.driver.phoneNo : null,
        status: updatedTrip.tripStatus,
        trip_status: updatedTrip.tripStatus,
        amount: Number(updatedTrip.amount).toFixed(2),
        eta: updatedTrip.eta ? updatedTrip.eta.toISOString() : null,
        assigned_at: updatedTrip.assignedAt ? updatedTrip.assignedAt.toISOString() : null
      }
    };
  });
}
