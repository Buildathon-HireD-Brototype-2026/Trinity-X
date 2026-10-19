import {
  listAdmins,
  getAdminById,
  createAdminAccount,
  updateAdminProfile,
  changeAdminAccountStatus
} from './admin.service.js';
import {
  createAdminDirectly,
  createPartnerDirectly,
  createDriverDirectly,
  activateDriver,
  listPartnerRegistrationRequests,
  approvePartnerRegistration,
  rejectPartnerRegistration
} from '../onboarding/onboarding.service.js';
import { successResponse, listResponse } from '../../shared/response.js';
import { parsePagination } from '../../middlewares/validate.middleware.js';

function isApiV1(req) {
  return req.originalUrl?.startsWith('/api/v1') || req.baseUrl?.startsWith('/api/v1');
}

// ============================================================================
// OpenAPI Admin Account Management Handlers
// ============================================================================

export async function listAdminsHandler(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status } = req.query;

    const result = await listAdmins({ status, page, limit, skip });
    return listResponse(res, result.items, result.page, result.limit, result.total, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function getAdminHandler(req, res, next) {
  try {
    const adminId = req.params.admin_id || req.params.adminId;
    const admin = await getAdminById(adminId);
    return successResponse(res, 200, admin, 'OK');
  } catch (err) {
    next(err);
  }
}

export async function createAdminHandler(req, res, next) {
  try {
    // Legacy fallback if called on baseline route without password
    if (!isApiV1(req) && !req.body.password && req.body.adminName) {
      return createAdmin(req, res);
    }

    const admin = await createAdminAccount(req.body, req.user, req.ip);
    if (!isApiV1(req)) {
      return res.status(201).json({ status: 'ok', data: admin });
    }
    return successResponse(res, 201, admin, 'Admin created.');
  } catch (err) {
    next(err);
  }
}

export async function updateAdminHandler(req, res, next) {
  try {
    const adminId = req.params.admin_id || req.params.adminId;
    const admin = await updateAdminProfile(adminId, req.body, req.user, req.ip);
    return successResponse(res, 200, admin, 'Admin updated.');
  } catch (err) {
    next(err);
  }
}

export async function changeAdminStatusHandler(req, res, next) {
  try {
    const adminId = req.params.admin_id || req.params.adminId;
    const admin = await changeAdminAccountStatus(adminId, req.body, req.user, req.ip);
    return successResponse(res, 200, admin, 'Admin status changed.');
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Preserved Baseline Onboarding & Admin Controllers
// ============================================================================

export async function createAdmin(req, res) {
  try {
    const result = await createAdminDirectly(req.body);
    return res.status(201).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to create admin.'
    });
  }
}

export async function createPartner(req, res) {
  try {
    const result = await createPartnerDirectly(req.body);
    return res.status(201).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to create partner.'
    });
  }
}

export async function createDriver(req, res) {
  try {
    const result = await createDriverDirectly(req.body);
    return res.status(201).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to create driver.'
    });
  }
}

export async function activateDriverAccount(req, res) {
  try {
    const { driverId } = req.params;
    const result = await activateDriver(driverId);
    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to activate driver.'
    });
  }
}

export async function listRegistrations(req, res) {
  try {
    const { status } = req.query;
    const requests = await listPartnerRegistrationRequests(status);
    return res.status(200).json({
      status: 'ok',
      data: { requests }
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to list registrations.'
    });
  }
}

export async function approveRegistration(req, res) {
  try {
    const { requestId } = req.params;
    const { officeId, hiredSplit, driverSplit } = req.body;
    const adminId = req.user.userId;

    const result = await approvePartnerRegistration({
      requestId,
      adminId,
      officeId,
      hiredSplit,
      driverSplit
    });

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to approve registration.'
    });
  }
}

export async function rejectRegistration(req, res) {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    const result = await rejectPartnerRegistration({
      requestId,
      adminId,
      reason
    });

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Failed to reject registration.'
    });
  }
}
