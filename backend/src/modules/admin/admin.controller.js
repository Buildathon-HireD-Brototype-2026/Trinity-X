import {
  createAdminDirectly,
  createPartnerDirectly,
  createDriverDirectly,
  activateDriver,
  listPartnerRegistrationRequests,
  approvePartnerRegistration,
  rejectPartnerRegistration
} from '../onboarding/onboarding.service.js';

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
