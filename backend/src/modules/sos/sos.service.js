import prisma from '../../config/db.js';

/**
 * Format TripSosAlert Prisma record into clean JSON with Numbers for Decimals
 */
export function formatSosAlert(alert) {
  if (!alert) return null;
  return {
    alertId: alert.alertId,
    tripId: alert.tripId,
    driverId: alert.driverId,
    orderId: alert.orderId,
    reason: alert.reason,
    notes: alert.notes || null,
    latitude: alert.latitude != null ? Number(alert.latitude) : null,
    longitude: alert.longitude != null ? Number(alert.longitude) : null,
    status: alert.status,
    primaryAdminId: alert.primaryAdminId || null,
    claimedByAdminId: alert.claimedByAdminId || null,
    claimedByAdminName: alert.claimedByAdmin?.adminName || null,
    claimedAt: alert.claimedAt ? alert.claimedAt.toISOString() : null,
    resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
    resolutionNotes: alert.resolutionNotes || null,
    createdAt: alert.createdAt ? alert.createdAt.toISOString() : null,
    updatedAt: alert.updatedAt ? alert.updatedAt.toISOString() : null,
    driverName: alert.driver?.name || null,
    driverPhone: alert.driver?.phoneNo || null,
    vehiclePlate: null,
    companyName: alert.order?.company?.name || null,
    trip: alert.trip ? {
      tripId: alert.trip.tripId,
      tripStatus: alert.trip.tripStatus,
      amount: alert.trip.amount != null ? Number(alert.trip.amount) : null
    } : undefined,
    order: alert.order ? {
      orderId: alert.order.orderId,
      pickupSpot: alert.order.pickupSpot,
      dropoffSpot: alert.order.dropoffSpot,
      contactName: alert.order.contactName,
      contactPhone: alert.order.contactPhone
    } : undefined
  };
}

const ALERT_INCLUDES = {
  driver: true,
  order: {
    include: {
      company: true
    }
  },
  trip: true,
  claimedByAdmin: true
};

/**
 * Create or return active SOS alert for a trip
 */
export async function createTripSosAlert({ tripId, driverId, reason, notes, latitude, longitude }) {
  // 1. Verify trip exists, belongs to driver, and is IN_PROGRESS
  const trip = await prisma.trip.findUnique({
    where: { tripId },
    include: {
      order: {
        include: {
          company: true
        }
      },
      driver: true
    }
  });

  if (!trip) {
    const error = new Error('Trip not found.');
    error.statusCode = 400;
    error.code = 'INVALID_TRIP';
    throw error;
  }

  if (trip.driverId !== driverId) {
    const error = new Error('Trip does not belong to this driver.');
    error.statusCode = 400;
    error.code = 'FORBIDDEN_TRIP';
    throw error;
  }

  const isOngoing = trip.tripStatus === 'IN_PROGRESS' || trip.tripStatus === 'ONGOING';
  if (!isOngoing) {
    const error = new Error(`Trip is not currently IN_PROGRESS (current status: ${trip.tripStatus}).`);
    error.statusCode = 400;
    error.code = 'INVALID_TRIP_STATUS';
    throw error;
  }

  // 2. Validate reason
  if (!['VEHICLE_DAMAGE', 'MEDICAL_EMERGENCY'].includes(reason)) {
    const error = new Error('Reason must be either VEHICLE_DAMAGE or MEDICAL_EMERGENCY.');
    error.statusCode = 400;
    error.code = 'INVALID_REASON';
    throw error;
  }

  // 3. Validate coordinates
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const error = new Error('Valid latitude (-90 to 90) and longitude (-180 to 180) numbers are required.');
    error.statusCode = 400;
    error.code = 'INVALID_COORDINATES';
    throw error;
  }

  // 4. Return active alert if one already exists
  const existingActiveAlert = await prisma.tripSosAlert.findFirst({
    where: {
      tripId,
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    },
    include: ALERT_INCLUDES,
    orderBy: { createdAt: 'desc' }
  });

  if (existingActiveAlert) {
    return {
      alert: formatSosAlert(existingActiveAlert),
      isExisting: true
    };
  }

  // 5. Determine primaryAdminId from order.decidedByAdminId or order.createdByAdminId
  const primaryAdminId = trip.order?.decidedByAdminId || trip.order?.createdByAdminId || null;

  const newAlert = await prisma.tripSosAlert.create({
    data: {
      tripId,
      driverId,
      orderId: trip.orderId,
      reason,
      notes: notes ? String(notes).trim() : null,
      latitude: lat,
      longitude: lng,
      status: 'OPEN',
      primaryAdminId
    },
    include: ALERT_INCLUDES
  });

  return {
    alert: formatSosAlert(newAlert),
    isExisting: false
  };
}

/**
 * Get latest active or recent alert for driver trip
 */
export async function getActiveTripSosAlert(tripId, driverId) {
  const alert = await prisma.tripSosAlert.findFirst({
    where: {
      tripId,
      driverId
    },
    include: ALERT_INCLUDES,
    orderBy: { createdAt: 'desc' }
  });

  if (!alert) {
    return null;
  }
  return formatSosAlert(alert);
}

/**
 * Driver updates live location for active SOS alert
 */
export async function updateDriverSosLocation(alertId, driverId, latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const error = new Error('Valid latitude and longitude numbers are required.');
    error.statusCode = 400;
    error.code = 'INVALID_COORDINATES';
    throw error;
  }

  const alert = await prisma.tripSosAlert.findUnique({
    where: { alertId }
  });

  if (!alert || alert.driverId !== driverId) {
    const error = new Error('SOS alert not found.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!['OPEN', 'IN_PROGRESS'].includes(alert.status)) {
    const error = new Error(`Location can only be updated while SOS is active (current status: ${alert.status}).`);
    error.statusCode = 400;
    error.code = 'ALERT_NOT_ACTIVE';
    throw error;
  }

  const updated = await prisma.tripSosAlert.update({
    where: { alertId },
    data: {
      latitude: lat,
      longitude: lng
    },
    include: ALERT_INCLUDES
  });

  return formatSosAlert(updated);
}

/**
 * Driver cancels SOS as false alarm
 */
export async function cancelDriverSosAlert(alertId, driverId) {
  const alert = await prisma.tripSosAlert.findUnique({
    where: { alertId },
    include: ALERT_INCLUDES
  });

  if (!alert || alert.driverId !== driverId) {
    const error = new Error('SOS alert not found.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (alert.status === 'RESOLVED') {
    return formatSosAlert(alert);
  }

  const updated = await prisma.tripSosAlert.update({
    where: { alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: 'Cancelled by driver (false alarm)'
    },
    include: ALERT_INCLUDES
  });

  return formatSosAlert(updated);
}

/**
 * Admin: list active alerts (OPEN and IN_PROGRESS)
 */
export async function getActiveSosAlertsForAdmin() {
  const alerts = await prisma.tripSosAlert.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    },
    include: ALERT_INCLUDES,
    orderBy: { createdAt: 'desc' }
  });

  return alerts.map(formatSosAlert);
}

/**
 * Admin: race-safe claim SOS alert
 */
export async function claimSosAlertByAdmin(alertId, adminId) {
  const result = await prisma.tripSosAlert.updateMany({
    where: {
      alertId,
      status: 'OPEN',
      claimedByAdminId: null
    },
    data: {
      status: 'IN_PROGRESS',
      claimedByAdminId: adminId,
      claimedAt: new Date()
    }
  });

  if (result.count === 0) {
    const currentAlert = await prisma.tripSosAlert.findUnique({
      where: { alertId },
      include: { claimedByAdmin: true }
    });

    if (!currentAlert) {
      const error = new Error('SOS alert not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const claimerName = currentAlert.claimedByAdmin?.adminName || 'another admin';
    const error = new Error(`Already claimed by ${claimerName}`);
    error.statusCode = 409;
    error.code = 'ALREADY_CLAIMED';
    error.details = [{
      claimedByAdminId: currentAlert.claimedByAdminId,
      claimedByAdminName: claimerName,
      status: currentAlert.status
    }];
    throw error;
  }

  const updatedAlert = await prisma.tripSosAlert.findUnique({
    where: { alertId },
    include: ALERT_INCLUDES
  });

  return formatSosAlert(updatedAlert);
}

/**
 * Admin: resolve SOS alert with resolutionNotes
 */
export async function resolveSosAlertByAdmin(alertId, adminId, resolutionNotes) {
  if (!resolutionNotes || !resolutionNotes.trim()) {
    const error = new Error('resolutionNotes is required to resolve an SOS alert.');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT';
    throw error;
  }

  const currentAlert = await prisma.tripSosAlert.findUnique({
    where: { alertId },
    include: { claimedByAdmin: true }
  });

  if (!currentAlert) {
    const error = new Error('SOS alert not found.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (currentAlert.status === 'RESOLVED') {
    const error = new Error('SOS alert is already resolved.');
    error.statusCode = 409;
    error.code = 'ALREADY_RESOLVED';
    throw error;
  }

  if (currentAlert.status !== 'IN_PROGRESS') {
    const error = new Error('SOS alert must be claimed (IN_PROGRESS) before it can be resolved.');
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  if (currentAlert.claimedByAdminId !== adminId) {
    const claimerName = currentAlert.claimedByAdmin?.adminName || 'the assigned admin';
    const error = new Error(`Only the admin who claimed this SOS (${claimerName}) can resolve it.`);
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updatedAlert = await prisma.tripSosAlert.update({
    where: { alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: resolutionNotes.trim()
    },
    include: ALERT_INCLUDES
  });

  return formatSosAlert(updatedAlert);
}

/**
 * Admin: get single SOS alert details
 */
export async function getSosAlertDetails(alertId) {
  const alert = await prisma.tripSosAlert.findUnique({
    where: { alertId },
    include: ALERT_INCLUDES
  });

  if (!alert) {
    const error = new Error('SOS alert not found.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return formatSosAlert(alert);
}
