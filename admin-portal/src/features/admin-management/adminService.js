/**
 * adminService.js
 * Mock service for admin management (admin onboarding feature).
 * Uses an in-memory store. Replace the API stubs with real HTTP calls
 * once the backend endpoints are ready.
 *
 * Backend endpoints (future):
 *   GET    /api/v1/admins
 *   POST   /api/v1/admins
 *   PATCH  /api/v1/admins/:id/status
 */

import { registerAuthAdmin, updateAuthAdminStatus } from '../auth/AuthContext';

// ---------------------------------------------------------------------------
// In-memory store — seeded to match DEFAULT_ADMINS in AuthContext.jsx
// ---------------------------------------------------------------------------
let _admins = [
  {
    id: 'ADM-001',
    admin_name: 'Admin One',
    email_id: 'admin1@hired.com',
    phone_no: '+91 98450 11223',
    office_id: 'OFF-001',
    status: 'ACTIVE',
    created_at: '2026-09-01T09:00:00Z',
  },
  {
    id: 'ADM-002',
    admin_name: 'Neha Sharma',
    email_id: 'admin2@hired.com',
    phone_no: '+91 98765 43210',
    office_id: 'OFF-001',
    status: 'ACTIVE',
    created_at: '2026-09-03T10:30:00Z',
  },
  {
    id: 'ADM-003',
    admin_name: 'Inactive Admin',
    email_id: 'inactive@hired.com',
    phone_no: '+91 98111 22334',
    office_id: 'OFF-001',
    status: 'INACTIVE',
    created_at: '2026-09-10T08:00:00Z',
  },
];

// Simple counter for generating new IDs
let _nextIndex = _admins.length + 1;

// Simulated network delay (ms) — remove when wiring real API
const FAKE_DELAY = 350;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// getAdmins
// Returns the full list of admins.
//
// Future: GET /api/v1/admins
// ---------------------------------------------------------------------------
export async function getAdmins() {
  await delay(FAKE_DELAY);
  // Return a shallow copy so callers cannot mutate the store directly
  return [..._admins];
}

// ---------------------------------------------------------------------------
// addAdmin
// Adds a new admin to the store.
// @param {object} data  - { admin_name, email_id, phone_no, office_id, password }
// @returns {object}       The newly created admin record
// @throws                 If email already exists
//
// Future: POST /api/v1/admins
// ---------------------------------------------------------------------------
export async function addAdmin(data) {
  await delay(FAKE_DELAY);

  const { admin_name, email_id, phone_no, office_id } = data;

  // Basic validation
  if (!admin_name || !email_id || !phone_no) {
    throw new Error('admin_name, email_id, and phone_no are required.');
  }

  // Duplicate email check
  const duplicate = _admins.find(
    (a) => a.email_id.toLowerCase() === email_id.trim().toLowerCase()
  );
  if (duplicate) {
    throw new Error('An admin with this email already exists.');
  }

  const newAdmin = {
    id: `ADM-${String(_admins.length + 1).padStart(3, '0')}`,
    admin_name: admin_name.trim(),
    email_id: email_id.trim().toLowerCase(),
    phone_no: phone_no.trim(),
    office_id: office_id || 'OFF-001',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  _admins = [..._admins, newAdmin];
  _nextIndex++;

  registerAuthAdmin({
    id: newAdmin.id,
    name: newAdmin.admin_name,
    email: newAdmin.email_id,
    phone: newAdmin.phone_no,
    password: data.password || 'Password@123',
    status: 'ACTIVE',
  });

  return { ...newAdmin };
}

// ---------------------------------------------------------------------------
// deactivateAdmin
// Sets an admin's status to INACTIVE.
// PRD rule: cannot deactivate if only 1 ACTIVE admin would remain
//           (two-person invoice verification requires >= 2 active admins).
//
// @param {string} id  - The admin id to deactivate
// @returns {object}     The updated admin record
// @throws               If the operation would leave fewer than 2 active admins
//
// Future: PATCH /api/v1/admins/:id/status  { status: 'INACTIVE' }
// ---------------------------------------------------------------------------
export async function deactivateAdmin(id, currentUserIdOrEmail) {
  await delay(FAKE_DELAY);

  const target = _admins.find((a) => a.id === id);
  if (!target) {
    throw new Error(`Admin with id "${id}" not found.`);
  }

  // Security guard (VULN-01): cannot deactivate own account
  if (
    currentUserIdOrEmail &&
    (target.id === currentUserIdOrEmail ||
      target.email_id.toLowerCase() === currentUserIdOrEmail.toLowerCase())
  ) {
    throw new Error('You cannot deactivate your own account.');
  }

  if (target.status === 'INACTIVE') {
    throw new Error('Admin is already inactive.');
  }

  // PRD guard: at least 2 active admins must remain for two-person verification
  const activeCount = _admins.filter((a) => a.status === 'ACTIVE').length;
  if (activeCount <= 2) {
    throw new Error(
      'Cannot deactivate: at least 2 active admins must exist for invoice verification.'
    );
  }

  _admins = _admins.map((a) =>
    a.id === id ? { ...a, status: 'INACTIVE', updated_at: new Date().toISOString() } : a
  );

  updateAuthAdminStatus(id, 'INACTIVE');

  return { ..._admins.find((a) => a.id === id) };
}

// ---------------------------------------------------------------------------
// reactivateAdmin  (bonus stub — may be needed later)
// Sets an admin's status back to ACTIVE.
//
// Future: PATCH /api/v1/admins/:id/status  { status: 'ACTIVE' }
// ---------------------------------------------------------------------------
export async function reactivateAdmin(id) {
  await delay(FAKE_DELAY);

  const target = _admins.find((a) => a.id === id);
  if (!target) {
    throw new Error(`Admin with id "${id}" not found.`);
  }

  if (target.status === 'ACTIVE') {
    throw new Error('Admin is already active.');
  }

  _admins = _admins.map((a) =>
    a.id === id ? { ...a, status: 'ACTIVE', updated_at: new Date().toISOString() } : a
  );

  updateAuthAdminStatus(id, 'ACTIVE');

  return { ..._admins.find((a) => a.id === id) };
}

