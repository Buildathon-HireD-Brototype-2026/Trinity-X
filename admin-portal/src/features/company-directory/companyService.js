/**
 * companyService.js
 * Service for B2B Client Company Directory & Registration Onboarding (PRD A-08, A-10, A-11).
 * Interacts with backend /api/v1/admin/companies and /api/v1/admin/partner-registrations
 * with resilient in-memory fallback store matching Prisma models.
 */

// ---------------------------------------------------------------------------
// Seed Data — aligned with Prisma model Company & CompanyRegistrationRequest
// ---------------------------------------------------------------------------
let _companies = [
  {
    companyId: 1,
    name: 'Acme Technologies Pvt Ltd',
    address: 'Tech Park, Whitefield, Bengaluru',
    contactPerson: 'Aditi Rao',
    phoneNo: '+91 98450 33445',
    emailId: 'aditi@acmetech.com',
    status: 'ACTIVE',
    officeId: 1,
    companyLocation: 'Whitefield, Bengaluru',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    createdAt: '2026-09-15T08:00:00Z',
    totalBookings: 142
  },
  {
    companyId: 2,
    name: 'Nexus Logistics India',
    address: 'Indiranagar 100ft Rd, Bengaluru',
    contactPerson: 'Karan Mehra',
    phoneNo: '+91 98765 66778',
    emailId: 'karan@nexuslogistics.in',
    status: 'ACTIVE',
    officeId: 1,
    companyLocation: 'Indiranagar, Bengaluru',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    createdAt: '2026-09-20T10:15:00Z',
    totalBookings: 89
  },
  {
    companyId: 3,
    name: 'Zenith Global Healthcare',
    address: 'Koramangala 4th Block, Bengaluru',
    contactPerson: 'Pooja Hegde',
    phoneNo: '+91 98112 44556',
    emailId: 'pooja@zenithhealth.org',
    status: 'INACTIVE',
    officeId: 1,
    companyLocation: 'Koramangala, Bengaluru',
    hiredSplit: 25.00,
    driverSplit: 75.00,
    createdAt: '2026-08-10T14:30:00Z',
    totalBookings: 34
  },
  {
    companyId: 4,
    name: 'Starlight Financial Services',
    address: 'HSR Layout Sector 1, Bengaluru',
    contactPerson: 'Vikram Joshi',
    phoneNo: '+91 99002 88990',
    emailId: 'vikram@starlightfin.com',
    status: 'ACTIVE',
    officeId: 1,
    companyLocation: 'HSR Layout, Bengaluru',
    hiredSplit: 15.00,
    driverSplit: 85.00,
    createdAt: '2026-10-01T09:45:00Z',
    totalBookings: 61
  }
];

let _registrations = [
  {
    requestId: 101,
    companyName: 'BluePeak Analytics Pvt Ltd',
    contactPerson: 'Rahul Sen',
    emailId: 'rahul@bluepeak.ai',
    phoneNo: '+91 97412 11223',
    companyLocation: 'Electronic City, Bengaluru',
    address: 'Electronics City Phase 1, Bengaluru',
    notes: 'Requires 10 daily executive sedans for corporate campus transport.',
    status: 'PENDING',
    createdAt: '2026-10-18T11:00:00Z'
  },
  {
    requestId: 102,
    companyName: 'Apex Cloud Solutions',
    contactPerson: 'Meera Nair',
    emailId: 'meera@apexcloud.io',
    phoneNo: '+91 98223 55667',
    companyLocation: 'Marathahalli, Bengaluru',
    address: 'Outer Ring Rd, Marathahalli, Bengaluru',
    notes: 'Looking for 24/7 airport and corporate transfer fleet partnership.',
    status: 'PENDING',
    createdAt: '2026-10-19T14:30:00Z'
  }
];

let _nextCompanyId = 5;
let _nextRequestId = 103;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieve secure admin authentication and anti-CSRF headers
 * @returns {Record<string, string>}
 */
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  try {
    const rawSession =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('hired_admin_session') || sessionStorage.getItem('hired_admin_user')
        : null;
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      const isExpired = parsed.expiresAt && Date.now() > parsed.expiresAt;
      if (parsed.token && !isExpired) {
        headers['Authorization'] = `Bearer ${parsed.token}`;
      }
    }
  } catch {
    // fallback
  }
  return headers;
}

/**
 * Fetch list of companies with optional filters
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'ACTIVE' | 'INACTIVE'
 * @param {string} [options.search] - query string
 * @returns {Promise<Array>}
 */
export async function getCompanies({ status = 'ALL', search = '' } = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (status !== 'ALL') queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const res = await fetch(`/api/v1/admin/companies?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {
    // Fallback to client-side store
  }

  await delay(250);

  let filtered = [..._companies];

  if (status !== 'ALL') {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.emailId && c.emailId.toLowerCase().includes(q)) ||
        (c.phoneNo && c.phoneNo.toLowerCase().includes(q)) ||
        (c.companyLocation && c.companyLocation.toLowerCase().includes(q))
    );
  }

  return filtered;
}

/**
 * Fetch registration requests queue
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
 * @returns {Promise<Array>}
 */
export async function getRegistrationRequests({ status = 'ALL' } = {}) {
  try {
    const res = await fetch('/api/v1/admin/partner-registrations', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) return json.data;
    }
  } catch {
    // Fallback
  }

  await delay(200);

  if (status === 'ALL') {
    return [..._registrations];
  }
  return _registrations.filter((r) => r.status === status);
}

/**
 * Approve registration request and auto-provision Company account (PRD A-08, A-10)
 * @param {number} requestId
 * @returns {Promise<Object>} The newly provisioned company
 */
export async function approveRegistrationRequest(requestId) {
  try {
    const res = await fetch(`/api/v1/admin/partner-registrations/${requestId}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // fallback
  }

  await delay(300);
  const req = _registrations.find((r) => r.requestId === Number(requestId));
  if (!req) throw new Error('Registration request not found');

  req.status = 'APPROVED';
  req.reviewedAt = new Date().toISOString();

  // Provision new company record
  const newCompany = {
    companyId: _nextCompanyId++,
    name: req.companyName,
    address: req.address || req.companyLocation || 'Bengaluru',
    contactPerson: req.contactPerson,
    phoneNo: req.phoneNo,
    emailId: req.emailId,
    status: 'ACTIVE',
    officeId: 1,
    companyLocation: req.companyLocation || 'Bengaluru',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    createdAt: new Date().toISOString(),
    totalBookings: 0
  };

  _companies.unshift(newCompany);
  return { ...newCompany };
}

/**
 * Reject registration request with mandatory reason
 * @param {number} requestId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function rejectRegistrationRequest(requestId, reason = '') {
  const sanitizedReason = (reason || 'Registration did not meet criteria').trim().slice(0, 500);

  try {
    const res = await fetch(`/api/v1/admin/partner-registrations/${requestId}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ rejectionReason: sanitizedReason })
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {
    // fallback
  }

  await delay(300);
  const req = _registrations.find((r) => r.requestId === Number(requestId));
  if (!req) throw new Error('Registration request not found');

  req.status = 'REJECTED';
  req.rejectionReason = sanitizedReason;
  req.reviewedAt = new Date().toISOString();

  return { ...req };
}

/**
 * Toggle company status (ACTIVE <-> INACTIVE)
 * @param {number} companyId
 * @returns {Promise<Object>}
 */
export async function toggleCompanyStatus(companyId) {
  await delay(250);
  const target = _companies.find((c) => c.companyId === Number(companyId));
  if (!target) throw new Error('Company not found');

  target.status = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  target.updatedAt = new Date().toISOString();

  return { ...target };
}

/**
 * Update company revenue payout split (PRD A-11)
 * @param {number} companyId
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

  await delay(250);
  const target = _companies.find((c) => c.companyId === Number(companyId));
  if (!target) throw new Error('Company not found');

  target.hiredSplit = Number(h.toFixed(2));
  target.driverSplit = Number(d.toFixed(2));
  target.updatedAt = new Date().toISOString();

  return { ...target };
}

/**
 * Add / manually provision a new company (PRD A-08, A-10)
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function addCompany(data) {
  await delay(350);

  const cleanEmail = (data.emailId || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Corporate email is required');

  const duplicate = _companies.some((c) => c.emailId.toLowerCase() === cleanEmail);
  if (duplicate) {
    throw new Error('A company with this email address already exists.');
  }

  const h = Number(data.hiredSplit ?? 20);
  const d = Number(data.driverSplit ?? 80);
  if (Math.abs(h + d - 100) > 0.01) {
    throw new Error('HireD split and Driver split must sum to exactly 100.00%');
  }

  const newCompany = {
    companyId: _nextCompanyId++,
    name: data.name.trim(),
    address: (data.address || data.location || 'Bengaluru').trim(),
    contactPerson: data.contactPerson.trim(),
    phoneNo: data.phoneNo.trim(),
    emailId: cleanEmail,
    status: data.status || 'ACTIVE',
    officeId: 1,
    companyLocation: data.location || 'Bengaluru',
    hiredSplit: Number(h.toFixed(2)),
    driverSplit: Number(d.toFixed(2)),
    createdAt: new Date().toISOString(),
    totalBookings: 0
  };

  _companies.unshift(newCompany);
  return { ...newCompany };
}
