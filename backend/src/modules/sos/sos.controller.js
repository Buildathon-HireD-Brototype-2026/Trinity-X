import { successResponse, errorResponse } from '../../shared/response.js';
import {
  createTripSosAlert,
  getActiveTripSosAlert,
  updateDriverSosLocation,
  cancelDriverSosAlert,
  getActiveSosAlertsForAdmin,
  getAllSosAlertsForAdmin,
  createSimulatedSosAlert,
  claimSosAlertByAdmin,
  resolveSosAlertByAdmin,
  getSosAlertDetails
} from './sos.service.js';

// ============================================================================
// Driver SOS Controllers
// ============================================================================

export async function createTripSosHandler(req, res, next) {
  try {
    const tripId = parseInt(req.params.tripId || req.params.trip_id, 10);
    if (isNaN(tripId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid trip ID is required.');
    }

    const driverId = req.user.userId;
    const { reason, notes, latitude, longitude } = req.body || {};

    const { alert, isExisting } = await createTripSosAlert({
      tripId,
      driverId,
      reason,
      notes,
      latitude,
      longitude
    });

    return successResponse(
      res,
      isExisting ? 200 : 201,
      alert,
      isExisting ? 'Active SOS alert already exists for this trip.' : 'SOS alert created successfully.'
    );
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function getActiveTripSosHandler(req, res, next) {
  try {
    const tripId = parseInt(req.params.tripId || req.params.trip_id, 10);
    if (isNaN(tripId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid trip ID is required.');
    }

    const driverId = req.user.userId;
    const alert = await getActiveTripSosAlert(tripId, driverId);

    return successResponse(res, 200, { alert });
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function updateDriverSosLocationHandler(req, res, next) {
  try {
    const alertId = parseInt(req.params.alertId || req.params.id, 10);
    if (isNaN(alertId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid alert ID is required.');
    }

    const driverId = req.user.userId;
    const { latitude, longitude } = req.body || {};

    const alert = await updateDriverSosLocation(alertId, driverId, latitude, longitude);
    return successResponse(res, 200, alert, 'SOS location updated successfully.');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function cancelDriverSosHandler(req, res, next) {
  try {
    const alertId = parseInt(req.params.alertId || req.params.id, 10);
    if (isNaN(alertId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid alert ID is required.');
    }

    const driverId = req.user.userId;
    const alert = await cancelDriverSosAlert(alertId, driverId);

    return successResponse(res, 200, alert, 'SOS alert marked as resolved (false alarm).');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

// ============================================================================
// Admin SOS Controllers
// ============================================================================

export async function getActiveSosAlertsForAdminHandler(req, res, next) {
  try {
    const alerts = await getActiveSosAlertsForAdmin();
    return successResponse(res, 200, alerts);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function claimSosAlertHandler(req, res, next) {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid alert ID is required.');
    }

    const adminId = req.user.userId;
    const alert = await claimSosAlertByAdmin(alertId, adminId);

    return successResponse(res, 200, alert, 'SOS alert claimed successfully.');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function resolveSosAlertHandler(req, res, next) {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid alert ID is required.');
    }

    const adminId = req.user.userId;
    const { resolutionNotes } = req.body || {};

    const alert = await resolveSosAlertByAdmin(alertId, adminId, resolutionNotes);
    return successResponse(res, 200, alert, 'SOS alert resolved successfully.');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function getSosAlertDetailsHandler(req, res, next) {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return errorResponse(res, 400, 'INVALID_PARAM', 'Valid alert ID is required.');
    }

    const alert = await getSosAlertDetails(alertId);
    return successResponse(res, 200, alert);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function getAllSosAlertsForAdminHandler(req, res, next) {
  try {
    const { status, search } = req.query;
    const alerts = await getAllSosAlertsForAdmin({ status, search });
    return successResponse(res, 200, alerts);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}

export async function createSimulatedSosAlertHandler(req, res, next) {
  try {
    const { tripId, reason, notes, latitude, longitude } = req.body || {};
    const { alert, isExisting } = await createSimulatedSosAlert({
      tripId,
      reason,
      notes,
      latitude,
      longitude
    });

    return successResponse(
      res,
      isExisting ? 200 : 201,
      alert,
      isExisting ? 'Active SOS alert already exists for this trip.' : 'Emergency SOS incident recorded successfully.'
    );
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.code, error.message, error.details || []);
    }
    next(error);
  }
}
