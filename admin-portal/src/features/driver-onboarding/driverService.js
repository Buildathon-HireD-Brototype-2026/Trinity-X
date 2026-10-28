/**
 * driverService.js
 * Service for Driver Onboarding & Management.
 * Connected directly to PostgreSQL backend API.
 */
import apiClient from '../../services/apiClient';

/**
 * Fetch drivers list with optional filters
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'
 * @param {string} [options.tab] - 'queue' | 'directory'
 * @param {string} [options.search] - query string
 * @returns {Promise<Array>}
 */
export async function getDrivers({ status = 'ALL', tab = 'queue', search = '' } = {}) {
  const queryParams = new URLSearchParams();
  if (status && status !== 'ALL') {
    queryParams.append('status', status);
  } else if (tab === 'queue') {
    queryParams.append('status', 'PENDING');
  }
  if (search && search.trim()) {
    queryParams.append('search', search.trim());
  }

  const qs = queryParams.toString();
  const url = `/admin/drivers${qs ? `?${qs}` : ''}`;
  const res = await apiClient.get(url);
  const items = res?.data?.items || res?.data || [];
  if (!Array.isArray(items)) return [];

  return items.map((d) => ({
    ...d,
    id: d.id || `DRV-${d.driver_id || d.driverId}`,
    driverId: d.driverId || d.driver_id,
    documents: d.documents || []
  }));
}

/**
 * Get single driver details
 */
export async function getDriverDetails(driverId) {
  const cleanId = String(driverId).replace(/\D/g, '') || driverId;
  const res = await apiClient.get(`/admin/drivers/${cleanId}`);
  return res?.data;
}

/**
 * Approve a driver and transition status to ACTIVE
 * @param {string|number} driverId
 * @returns {Promise<Object>}
 */
export async function approveDriver(driverId) {
  const cleanId = String(driverId).replace(/\D/g, '') || driverId;
  const res = await apiClient.patch(`/admin/drivers/${cleanId}/status`, {
    status: 'ACTIVE'
  });
  return res?.data || { id: driverId, status: 'ACTIVE' };
}

/**
 * Reject a driver application
 * @param {string|number} driverId
 * @param {string} [reason]
 * @returns {Promise<Object>}
 */
export async function rejectDriver(driverId, reason = '') {
  const cleanId = String(driverId).replace(/\D/g, '') || driverId;
  const sanitizedReason = (reason || 'Documents did not meet criteria').trim().slice(0, 500);
  const res = await apiClient.patch(`/admin/drivers/${cleanId}/status`, {
    status: 'INACTIVE',
    rejection_reason: sanitizedReason
  });
  return res?.data || { id: driverId, status: 'INACTIVE', rejection_reason: sanitizedReason };
}

/**
 * Toggle driver active status (ACTIVE <-> INACTIVE)
 * @param {string|number} driverId
 * @param {string} [nextStatus]
 * @returns {Promise<Object>}
 */
export async function toggleDriverStatus(driverId, nextStatus) {
  const cleanId = String(driverId).replace(/\D/g, '') || driverId;
  const statusToSend = nextStatus || 'ACTIVE';
  const res = await apiClient.patch(`/admin/drivers/${cleanId}/status`, {
    status: statusToSend
  });
  return res?.data || { id: driverId, status: statusToSend };
}

/**
 * Add / manually onboard a new driver
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function addDriver(data) {
  const cleanPhone = (data.phone_no || '').replace(/\s+/g, '');
  if (!cleanPhone) throw new Error('Please enter a valid phone number.');

  const payload = {
    name: (data.name || '').trim(),
    phone_no: cleanPhone,
    status: data.status || 'PENDING',
    current_location: data.location || ''
  };

  const res = await apiClient.post('/admin/drivers', payload);
  return res?.data;
}
