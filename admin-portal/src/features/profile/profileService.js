/**
 * profileService.js
 * API calls for the Admin Profile feature.
 *
 * Backend endpoints used:
 *   GET   /api/v1/admins/:admin_id   → fetch own profile
 *   PATCH /api/v1/admins/:admin_id   → update name, phone, email, password
 *
 * Both endpoints require: Authorization: Bearer <token>
 */

import { apiGet, apiPatch } from '@/services/api';

/**
 * Fetch the profile of the currently logged-in admin.
 *
 * @param {number|string} adminId  - Numeric backend admin_id
 * @param {string}        token    - JWT access token from session
 * @returns {Promise<object>}        Admin profile object from backend
 */
export async function fetchMyProfile(adminId, token) {
  return apiGet(`/api/v1/admins/${adminId}`, token);
}

/**
 * Update the currently logged-in admin's profile.
 *
 * Permitted fields (backend enforced):
 *   admin_name, phone_no, email_id, password
 *
 * @param {number|string} adminId  - Numeric backend admin_id
 * @param {string}        token    - JWT access token from session
 * @param {object}        data     - Fields to update
 * @param {string}        [data.admin_name]
 * @param {string}        [data.phone_no]
 * @param {string}        [data.email_id]
 * @param {string}        [data.password]
 * @returns {Promise<object>}        Updated admin profile from backend
 */
export async function updateMyProfile(adminId, token, data) {
  const payload = {};

  if (data.name !== undefined)  payload.admin_name = data.name.trim();
  if (data.phone !== undefined) payload.phone_no   = data.phone.trim();
  if (data.email !== undefined) payload.email_id   = data.email.trim().toLowerCase();
  if (data.password !== undefined && data.password.trim()) {
    payload.password = data.password.trim();
  }

  return apiPatch(`/api/v1/admins/${adminId}`, payload, token);
}
