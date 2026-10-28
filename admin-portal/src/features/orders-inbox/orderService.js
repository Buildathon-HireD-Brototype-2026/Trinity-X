/**
 * orderService.js
 * Service layer for Orders & Enquiries Inbox (PRD A-02, A-03, A-04, A-05).
 * Aligned with PostgreSQL / Prisma models: Order, Company, and Trip.
 * Operates with live API fallback to an in-memory client store.
 */

// ---------------------------------------------------------------------------
// Seed Data — Aligned with Prisma models Order & Company
// ---------------------------------------------------------------------------
let _orders = [
  {
    orderId: 1001,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    pickupSpot: 'Tech Park Gate 2, Whitefield, Bengaluru',
    dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 2',
    pickupTime: '2026-10-21T09:30:00Z',
    contactName: 'Raghavan Iyer',
    contactPhone: '+91 98450 11223',
    vehicleType: 'Sedan',
    notes: 'Airport transfer for executive delegate. Flight departs at 13:00.',
    status: 'RECEIVED',
    source: 'B2B_PORTAL',
    estimatedFare: 1450.00,
    tripAmount: null,
    rejectReason: null,
    createdAt: '2026-10-20T21:15:00Z'
  },
  {
    orderId: 1002,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    pickupSpot: 'Indiranagar 100ft Rd Metro Station, Bengaluru',
    dropoffSpot: 'Electronic City Phase 1, Toll Plaza, Bengaluru',
    pickupTime: '2026-10-21T11:00:00Z',
    contactName: 'Shreya Sengupta',
    contactPhone: '+91 98765 22334',
    vehicleType: 'SUV',
    notes: 'Client site audit visit. 3 passengers with laptop bags.',
    status: 'RECEIVED',
    source: 'WHATSAPP',
    estimatedFare: 980.00,
    tripAmount: null,
    rejectReason: null,
    createdAt: '2026-10-20T22:45:00Z'
  },
  {
    orderId: 1003,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    pickupSpot: 'Outer Ring Road, Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'MG Road Trinity Metro Station, Bengaluru',
    pickupTime: '2026-10-21T14:15:00Z',
    contactName: 'Vikram Malhotra',
    contactPhone: '+91 98112 55667',
    vehicleType: 'Sedan',
    notes: 'Inter-office meeting commute.',
    status: 'RECEIVED',
    source: 'PHONE',
    estimatedFare: 620.00,
    tripAmount: null,
    rejectReason: null,
    createdAt: '2026-10-20T23:30:00Z'
  },
  {
    orderId: 1004,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    pickupSpot: 'HSR Layout Sector 1, Bengaluru',
    dropoffSpot: 'Manyata Embassy Business Park, Hebbal',
    pickupTime: '2026-10-21T08:00:00Z',
    contactName: 'Meera Nambiar',
    contactPhone: '+91 98223 77889',
    vehicleType: 'Sedan',
    notes: 'Leadership review conference.',
    status: 'ACCEPTED',
    source: 'B2B_PORTAL',
    estimatedFare: 1100.00,
    tripAmount: 1150.00,
    rejectReason: null,
    createdAt: '2026-10-20T17:00:00Z'
  },
  {
    orderId: 1005,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    pickupSpot: 'Koramangala 5th Block, Bengaluru',
    dropoffSpot: 'Nelamangala Highway Toll, Bengaluru',
    pickupTime: '2026-10-20T19:00:00Z',
    contactName: 'Sunil Verma',
    contactPhone: '+91 98334 99001',
    vehicleType: 'Hatchback',
    notes: 'Late evening warehouse inspection.',
    status: 'REJECTED',
    source: 'B2B_PORTAL',
    estimatedFare: 850.00,
    tripAmount: null,
    rejectReason: 'Service area out of standard operational dispatch radius for requested vehicle type.',
    createdAt: '2026-10-20T15:20:00Z'
  }
];

// Active client companies available for manual order dispatch (PRD A-03, A-08)
let _activeCompanies = [
  { companyId: 1, name: 'Acme Technologies Pvt Ltd', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 2, name: 'Nexus Logistics India', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 4, name: 'Starlight Financial Services', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 5, name: 'Apex Cloud Solutions', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' }
];

let _nextOrderId = 1006;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieve secure admin authentication and anti-CSRF headers
 * with strict token freshness validation (ASVS 3.3.1).
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
 * Fetch list of orders with live search and status/source filters
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'RECEIVED' | 'ACCEPTED' | 'REJECTED'
 * @param {string} [options.source] - 'ALL' | 'B2B_PORTAL' | 'PHONE' | 'WHATSAPP'
 * @param {string} [options.search] - Search query string
 * @returns {Promise<Array>}
 */
export async function getOrders({ status = 'ALL', source = 'ALL', search = '' } = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (status !== 'ALL') queryParams.append('status', status);
    if (source !== 'ALL') queryParams.append('source', source);
    if (search.trim()) queryParams.append('search', search.trim());

    const res = await fetch(`/api/v1/admin/orders?${queryParams.toString()}`, {
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

  await delay(200);

  let filtered = [..._orders];

  if (status !== 'ALL') {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (source !== 'ALL') {
    filtered = filtered.filter((o) => o.source === source);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (o) =>
        `ord-${o.orderId}`.toLowerCase().includes(q) ||
        String(o.orderId).includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.contactName.toLowerCase().includes(q) ||
        o.contactPhone.toLowerCase().includes(q) ||
        o.pickupSpot.toLowerCase().includes(q) ||
        o.dropoffSpot.toLowerCase().includes(q)
    );
  }

  // Sort descending by order ID / creation date
  return filtered.sort((a, b) => b.orderId - a.orderId);
}

/**
 * Get active client companies for manual order creation
 * @returns {Promise<Array>}
 */
export async function getActiveCompanies() {
  try {
    const res = await fetch('/api/v1/admin/companies?status=ACTIVE', {
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
    // fallback
  }
  return _activeCompanies;
}

/**
 * Create a new order manually on behalf of a company (PRD A-03)
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
export async function createManualOrder(orderData) {
  try {
    const res = await fetch('/api/v1/admin/orders', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(orderData)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(300);

  const targetCompany = _activeCompanies.find(
    (c) => c.companyId === Number(orderData.companyId) && c.status === 'ACTIVE'
  );
  if (!targetCompany) {
    throw new Error('Selected corporate client account is inactive or not authorized for transport booking.');
  }

  const estimatedFare = Number(Number(orderData.estimatedFare || 0).toFixed(2));
  if (isNaN(estimatedFare) || estimatedFare <= 0 || estimatedFare > 500000) {
    throw new Error('Estimated trip fare must be a positive number between ₹1.00 and ₹5,00,000.00.');
  }

  const newOrder = {
    orderId: _nextOrderId++,
    companyId: targetCompany.companyId,
    companyName: targetCompany.name,
    pickupSpot: orderData.pickupSpot.trim(),
    dropoffSpot: orderData.dropoffSpot.trim(),
    pickupLatitude: orderData.pickupLatitude !== undefined ? orderData.pickupLatitude : null,
    pickupLongitude: orderData.pickupLongitude !== undefined ? orderData.pickupLongitude : null,
    dropLatitude: orderData.dropLatitude !== undefined ? orderData.dropLatitude : null,
    dropLongitude: orderData.dropLongitude !== undefined ? orderData.dropLongitude : null,
    pickupTime: orderData.pickupTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    contactName: orderData.contactName.trim(),
    contactPhone: orderData.contactPhone.trim(),
    vehicleType: orderData.vehicleType || 'Sedan',
    notes: (orderData.notes || '').trim(),
    status: 'RECEIVED',
    source: orderData.source || 'PHONE',
    estimatedFare,
    tripAmount: null,
    rejectReason: null,
    createdAt: new Date().toISOString()
  };

  _orders = [newOrder, ..._orders];
  return newOrder;
}

/**
 * Accept an incoming order and convert it into a trip (PRD A-05)
 * @param {number|string} orderId
 * @param {number|string} tripAmount
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function acceptOrder(orderId, tripAmount, options = {}) {
  const numericId = Number(orderId);
  const fare = Number(Number(tripAmount).toFixed(2));

  if (isNaN(fare) || fare <= 0 || fare > 500000) {
    throw new Error('Trip amount must be a positive number between ₹1.00 and ₹5,00,000.00.');
  }

  try {
    const res = await fetch(`/api/v1/admin/orders/${numericId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ tripAmount: fare, amount: fare, ...options })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(250);

  const idx = _orders.findIndex((o) => o.orderId === numericId);
  if (idx === -1) throw new Error('Order not found.');

  // Strict state machine validation: Cannot modify an already settled order
  if (_orders[idx].status !== 'RECEIVED') {
    throw new Error(`Order #ORD-${numericId} is already in a terminal state (${_orders[idx].status}) and cannot be modified.`);
  }

  _orders[idx] = {
    ..._orders[idx],
    status: 'ACCEPTED',
    tripAmount: fare,
    pickupLatitude: options.pickupLatitude !== undefined ? options.pickupLatitude : (_orders[idx].pickupLatitude ?? null),
    pickupLongitude: options.pickupLongitude !== undefined ? options.pickupLongitude : (_orders[idx].pickupLongitude ?? null),
    dropLatitude: options.dropLatitude !== undefined ? options.dropLatitude : (_orders[idx].dropLatitude ?? null),
    dropLongitude: options.dropLongitude !== undefined ? options.dropLongitude ?? null : (_orders[idx].dropLongitude ?? null),
    decidedAt: new Date().toISOString()
  };

  return _orders[idx];
}

/**
 * Reject an incoming order with mandatory rejection reason (PRD A-05)
 * @param {number|string} orderId
 * @param {string} rejectReason
 * @returns {Promise<Object>}
 */
export async function rejectOrder(orderId, rejectReason) {
  const numericId = Number(orderId);
  const reason = (rejectReason || '').trim();

  if (!reason) {
    throw new Error('A rejection reason is mandatory to notify the corporate client.');
  }
  if (reason.length > 500) {
    throw new Error('Rejection reason cannot exceed 500 characters.');
  }

  try {
    const res = await fetch(`/api/v1/admin/orders/${numericId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ rejectReason: reason })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(250);

  const idx = _orders.findIndex((o) => o.orderId === numericId);
  if (idx === -1) throw new Error('Order not found.');

  // Strict state machine validation: Cannot modify an already settled order
  if (_orders[idx].status !== 'RECEIVED') {
    throw new Error(`Order #ORD-${numericId} is already in a terminal state (${_orders[idx].status}) and cannot be modified.`);
  }

  _orders[idx] = {
    ..._orders[idx],
    status: 'REJECTED',
    rejectReason: reason,
    decidedAt: new Date().toISOString()
  };

  return _orders[idx];
}
