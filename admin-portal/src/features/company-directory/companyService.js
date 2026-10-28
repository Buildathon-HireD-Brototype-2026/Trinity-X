/**
 * companyService.js
 * Service for B2B Client Company Directory & Registration Onboarding.
 * Directly connected to PostgreSQL database through backend API client.
 */
import apiClient from '../../services/apiClient';

/**
 * Fetch list of companies with optional filters
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'ACTIVE' | 'INACTIVE'
 * @param {string} [options.search] - query string
 * @returns {Promise<Array>}
 */
export async function getCompanies({ status = 'ALL', search = '' } = {}) {
  const queryParams = new URLSearchParams();
  if (status && status !== 'ALL') queryParams.append('status', status);
  if (search && search.trim()) queryParams.append('search', search.trim());

  const qs = queryParams.toString();
  const url = `/admin/companies${qs ? `?${qs}` : ''}`;
  const res = await apiClient.get(url);
  const data = res?.data || [];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch registration requests queue
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
 * @returns {Promise<Array>}
 */
export async function getRegistrationRequests({ status = 'ALL' } = {}) {
  const queryParams = new URLSearchParams();
  if (status && status !== 'ALL') queryParams.append('status', status);

  const qs = queryParams.toString();
  const url = `/admin/partner-registrations${qs ? `?${qs}` : ''}`;
  const res = await apiClient.get(url);
  const data = res?.data || [];
  return Array.isArray(data) ? data : [];
}

/**
 * Approve registration request and auto-provision Company account
 * @param {number|string} requestId
 * @returns {Promise<Object>} The newly provisioned company
 */
export async function approveRegistrationRequest(requestId) {
  const res = await apiClient.patch(`/admin/partner-registrations/${requestId}/approve`);
  return res?.data;
}

/**
 * Reject registration request with mandatory reason
 * @param {number|string} requestId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function rejectRegistrationRequest(requestId, reason = '') {
  const sanitizedReason = (reason || 'Registration did not meet criteria').trim().slice(0, 500);
  const res = await apiClient.patch(`/admin/partner-registrations/${requestId}/reject`, {
    rejectionReason: sanitizedReason
  });
  return res?.data;
}

/**
 * Toggle company status (ACTIVE <-> INACTIVE)
 * @param {number|string} companyId
 * @returns {Promise<Object>}
 */
export async function toggleCompanyStatus(companyId) {
  const res = await apiClient.patch(`/admin/companies/${companyId}/status`);
  return res?.data;
}

/**
 * Update company revenue payout split
 * @param {number|string} companyId
 * @param {number} hiredSplit
 * @param {number} driverSplit
 * @returns {Promise<Object>}
 */
export async function updatePayoutSplit(companyId, hiredSplit, driverSplit) {
  const h = Number(hiredSplit);
  const d = Number(driverSplit);

  if (isNaN(h) || isNaN(d) || h < 0 || d < 0 || h > 100 || d > 100) {
    throw new Error('Split percentage must be between 0.00% and 100.00%');
  }

  if (Math.abs(h + d - 100) > 0.01) {
    throw new Error('HireD split and Driver split must sum to exactly 100.00%');
  }

  const res = await apiClient.patch(`/admin/companies/${companyId}/payout-split`, {
    hiredSplit: Number(h.toFixed(2)),
    driverSplit: Number(d.toFixed(2))
  });
  return res?.data;
}

/**
 * Add / manually provision a new company
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function addCompany(data) {
  const cleanEmail = (data.emailId || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Please enter a valid corporate email address.');

  const h = Number(data.hiredSplit ?? 20);
  const d = Number(data.driverSplit ?? 80);
  if (Math.abs(h + d - 100) > 0.01) {
    throw new Error('HireD split and Driver split must sum to exactly 100.00%');
  }

  const payload = {
    name: (data.name || '').trim(),
    address: (data.address || data.location || '').trim(),
    contactPerson: (data.contactPerson || '').trim(),
    phoneNo: (data.phoneNo || '').trim(),
    emailId: cleanEmail,
    status: data.status || 'ACTIVE',
    companyLocation: data.location || data.companyLocation || '',
    hiredSplit: Number(h.toFixed(2)),
    driverSplit: Number(d.toFixed(2))
  };

  const res = await apiClient.post('/admin/companies', payload);
  return res?.data;
}
