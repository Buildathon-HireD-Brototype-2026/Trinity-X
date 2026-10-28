/**
 * orderService.js
 * Service layer for Orders & Enquiries Inbox (PRD A-02, A-03, A-04, A-05).
 * Aligned with PostgreSQL / Prisma models: Order, Company, and Trip.
 * Operates with live API fallback to an in-memory client store.
 */

// ---------------------------------------------------------------------------
// Email Logs In-Memory Storage
// ---------------------------------------------------------------------------
let _emailLogs = [];

export function getEmailLogs() {
  return [..._emailLogs];
}

export function getEmailLogByOrderId(orderId) {
  return _emailLogs.filter((l) => l.order_id === Number(orderId));
}

// ---------------------------------------------------------------------------
// Seed Data — Aligned with Prisma models Order & Company
// ---------------------------------------------------------------------------
let _orders = [
  {
    orderId: 1006,
    companyId: 6,
    companyName: 'Nova Enterprises Global',
    companyEmail: 'maryneha2024@gmail.com',
    company: {
      name: 'Nova Enterprises Global',
      email: 'maryneha2024@gmail.com'
    },
    pickupSpot: 'Infopark Expressway Gate 1, Kakkanad, Kochi',
    dropoffSpot: 'Cochin International Airport (COK), Terminal 3',
    pickupTime: '2026-10-29T10:00:00Z',
    contactName: 'Neha Mary',
    contactPhone: '+91 98765 43210',
    vehicleType: 'Sedan',
    notes: 'Airport transfer for executive delegate. Flight departs at 18:30.',
    status: 'RECEIVED',
    source: 'B2B_PORTAL',
    estimatedFare: 1850.00,
    tripAmount: null,
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: '2026-10-28T05:30:00Z'
  },
  {
    orderId: 1001,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    companyEmail: 'aditi@acmetech.com',
    company: {
      name: 'Acme Technologies Pvt Ltd',
      email: 'aditi@acmetech.com'
    },
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
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: '2026-10-20T21:15:00Z'
  },
  {
    orderId: 1002,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    companyEmail: 'karan@nexuslogistics.in',
    company: {
      name: 'Nexus Logistics India',
      email: 'karan@nexuslogistics.in'
    },
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
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: '2026-10-20T22:45:00Z'
  },
  {
    orderId: 1003,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    companyEmail: 'aditi@acmetech.com',
    company: {
      name: 'Acme Technologies Pvt Ltd',
      email: 'aditi@acmetech.com'
    },
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
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: '2026-10-20T23:30:00Z'
  },
  {
    orderId: 1004,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    companyEmail: 'vikram@starlightfin.com',
    company: {
      name: 'Starlight Financial Services',
      email: 'vikram@starlightfin.com'
    },
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
    driverName: 'Vikram Singh',
    rejectReason: null,
    emailDispatched: true,
    emailStatus: 'sent',
    emailSentTo: 'vikram@starlightfin.com',
    emailSentFrom: 'admin@hired.com',
    emailDispatchedAt: '2026-10-20T17:05:00Z',
    emailType: 'ORDER_ACCEPTED',
    emailSubject: 'Order #1004 Accepted',
    emailSummary: 'Booking confirmed with trip fare ₹1150.00. Driver Vikram Singh allocated.',
    createdAt: '2026-10-20T17:00:00Z'
  },
  {
    orderId: 1005,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    companyEmail: 'karan@nexuslogistics.in',
    company: {
      name: 'Nexus Logistics India',
      email: 'karan@nexuslogistics.in'
    },
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
    driverName: null,
    rejectReason: 'No executive hatchbacks available in Koramangala corridor for late night slot.',
    emailDispatched: true,
    emailStatus: 'sent',
    emailSentTo: 'karan@nexuslogistics.in',
    emailSentFrom: 'admin@hired.com',
    emailDispatchedAt: '2026-10-20T17:35:00Z',
    emailType: 'ORDER_REJECTED',
    emailSubject: 'Order #1005 Rejected',
    emailSummary: 'Booking declined with reason: "No executive hatchbacks available in Koramangala corridor for late night slot."',
    createdAt: '2026-10-20T17:30:00Z'
  },
  {
    orderId: 1007,
    companyId: 7,
    companyName: 'Sunrise Retail Corp',
    companyEmail: '', // Missing email for test verification
    company: {
      name: 'Sunrise Retail Corp',
      email: '' // Missing email to verify "Company email missing, add it before sending"
    },
    pickupSpot: 'Brigade Road Junction, Bengaluru',
    dropoffSpot: 'Forum Mall, Koramangala',
    pickupTime: '2026-10-30T14:00:00Z',
    contactName: 'Ananya Roy',
    contactPhone: '+91 98760 12345',
    vehicleType: 'Sedan',
    notes: 'Retail vendor visit. Company registration pending official billing email.',
    status: 'RECEIVED',
    source: 'PHONE',
    estimatedFare: 450.00,
    tripAmount: null,
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: '2026-10-28T08:00:00Z'
  }
];

let _nextOrderId = 1008;

// Active companies list for manual bookings
let _activeCompanies = [
  { companyId: 1, name: 'Acme Technologies Pvt Ltd', emailId: 'aditi@acmetech.com', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 2, name: 'Nexus Logistics India', emailId: 'karan@nexuslogistics.in', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 4, name: 'Starlight Financial Services', emailId: 'vikram@starlightfin.com', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 5, name: 'Apex Cloud Solutions', emailId: 'meera@apexcloud.io', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 6, name: 'Nova Enterprises Global', emailId: 'maryneha2024@gmail.com', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' },
  { companyId: 7, name: 'Sunrise Retail Corp', emailId: '', hiredSplit: 20.00, driverSplit: 80.00, status: 'ACTIVE' }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAuthHeaders() {
  const token = sessionStorage.getItem('hired_admin_token') || localStorage.getItem('hired_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch list of orders with optional filters (PRD A-02)
 */
export async function getOrders({ status = 'ALL', source = 'ALL', search = '' } = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (status !== 'ALL') queryParams.append('status', status);
    if (source !== 'ALL') queryParams.append('source', source);
    if (search) queryParams.append('search', search);

    const res = await fetch(`/api/v1/admin/orders?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((o) => ({
          ...o,
          company: o.company || { name: o.companyName, email: o.companyEmail }
        }));
      }
    }
  } catch {
    // Graceful fallback to client-side store
  }

  await delay(150);

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
        String(o.orderId).includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.contactName.toLowerCase().includes(q) ||
        o.contactPhone.toLowerCase().includes(q) ||
        o.pickupSpot.toLowerCase().includes(q) ||
        o.dropoffSpot.toLowerCase().includes(q)
    );
  }

  return filtered.sort((a, b) => b.orderId - a.orderId);
}

/**
 * Get active client companies for manual order creation
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

  await delay(200);

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
    companyEmail: targetCompany.emailId || '',
    company: {
      name: targetCompany.name,
      email: targetCompany.emailId || ''
    },
    pickupSpot: orderData.pickupSpot.trim(),
    dropoffSpot: orderData.dropoffSpot.trim(),
    pickupTime: orderData.pickupTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    contactName: orderData.contactName.trim(),
    contactPhone: orderData.contactPhone.trim(),
    vehicleType: orderData.vehicleType || 'Sedan',
    notes: (orderData.notes || '').trim(),
    status: 'RECEIVED',
    source: orderData.source || 'PHONE',
    estimatedFare,
    tripAmount: null,
    driverName: null,
    rejectReason: null,
    emailDispatched: false,
    emailStatus: null,
    emailSentTo: null,
    emailSentFrom: null,
    emailSubject: null,
    emailBody: null,
    emailDispatchedAt: null,
    emailLog: null,
    createdAt: new Date().toISOString()
  };

  _orders = [newOrder, ..._orders];
  return newOrder;
}

/**
 * Accept an incoming order (PRD A-05).
 * Validates driver name, updates status to ACCEPTED, and dispatches the reviewed email.
 *
 * @param {number|string} orderId
 * @param {Object|number} options
 */
export async function acceptOrder(orderId, options = {}) {
  const numericId = Number(orderId);
  const idx = _orders.findIndex((o) => o.orderId === numericId);
  if (idx === -1) throw new Error('Order not found.');

  // Only pending orders can be accepted
  if (_orders[idx].status !== 'RECEIVED') {
    throw new Error(`Order #ORD-${numericId} is already in a terminal state (${_orders[idx].status}) and cannot be modified.`);
  }

  // Handle options format
  let driver = '';
  let fare = _orders[idx].tripAmount || _orders[idx].estimatedFare || 1200;
  let emailSubject = `Order #${numericId} Accepted`;
  let emailBody = '';
  let adminEmail = 'admin@hired.com';
  let companyEmail = _orders[idx].company?.email || _orders[idx].companyEmail || '';
  let simulateFailure = false;

  if (typeof options === 'object' && options !== null) {
    driver = (options.driverName || _orders[idx].driverName || '').trim();
    if (options.tripAmount) fare = Number(Number(options.tripAmount).toFixed(2));
    if (options.subject) emailSubject = options.subject.trim();
    if (options.body) emailBody = options.body.trim();
    if (options.from) adminEmail = options.from.trim();
    if (options.to) companyEmail = options.to.trim();
    simulateFailure = options.simulateFailure === true;
  } else if (typeof options === 'number' || typeof options === 'string') {
    fare = Number(Number(options).toFixed(2));
    driver = _orders[idx].driverName || 'Assigned Driver';
  }

  // Acceptance Check: Driver name is required
  if (!driver) {
    throw new Error('Driver name is required.');
  }

  if (isNaN(fare) || fare <= 0 || fare > 500000) {
    throw new Error('Trip amount must be a positive number between ₹1.00 and ₹5,00,000.00.');
  }

  // 1. UPDATE ORDER STATUS AND SAVE DRIVER
  const decidedAt = new Date().toISOString();
  _orders[idx] = {
    ..._orders[idx],
    status: 'ACCEPTED',
    driverName: driver,
    tripAmount: fare,
    decidedAt,
    emailSentTo: companyEmail,
    emailSentFrom: adminEmail,
    emailSubject,
    emailBody
  };

  // 2. DISPATCH SERVER-SIDE CONFIRMATION EMAIL
  let emailSent = false;
  let emailLog = null;
  let emailError = null;

  try {
    const res = await fetch(`/api/v1/admin/orders/${numericId}/send-decision-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(simulateFailure ? { 'x-simulate-email-failure': 'true' } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        orderId: numericId,
        type: 'accepted',
        to: companyEmail,
        from: adminEmail,
        subject: emailSubject,
        body: emailBody,
        simulateFailure
      })
    });

    if (res.ok) {
      const json = await res.json();
      emailSent = json.emailSent === true;
      emailLog = json.log || null;
      if (!emailSent) {
        emailError = json.error || 'Status updated, but email failed to send';
      }
    } else {
      emailSent = false;
      emailError = 'Status updated, but email failed to send';
    }
  } catch (err) {
    console.warn('[orderService] Server-side email failed or offline, recording local status:', err.message);
    emailSent = false;
    emailError = 'Status updated, but email failed to send';
  }

  // 3. RECORD AUDIT EMAIL LOG
  const logEntry = emailLog || {
    order_id: numericId,
    type: 'accepted',
    to: companyEmail,
    from: adminEmail,
    subject: emailSubject,
    body: emailBody,
    status: emailSent ? 'sent' : 'failed',
    error: emailError,
    sent_at: new Date().toISOString()
  };
  _emailLogs.unshift(logEntry);

  _orders[idx] = {
    ..._orders[idx],
    emailDispatched: emailSent,
    emailStatus: emailSent ? 'sent' : 'failed',
    emailDispatchedAt: logEntry.sent_at,
    emailLog: logEntry,
    emailLastError: emailError
  };

  return {
    order: _orders[idx],
    emailSent,
    error: emailError
  };
}

/**
 * Reject an incoming order (PRD A-05).
 * Validates reason, updates status to REJECTED, and dispatches the reviewed email.
 *
 * @param {number|string} orderId
 * @param {Object|string} options
 */
export async function rejectOrder(orderId, options = {}) {
  const numericId = Number(orderId);
  const idx = _orders.findIndex((o) => o.orderId === numericId);
  if (idx === -1) throw new Error('Order not found.');

  // Only pending orders can be rejected
  if (_orders[idx].status !== 'RECEIVED') {
    throw new Error(`Order #ORD-${numericId} is already in a terminal state (${_orders[idx].status}) and cannot be modified.`);
  }

  let reason = '';
  let emailSubject = `Order #${numericId} Rejected`;
  let emailBody = '';
  let adminEmail = 'admin@hired.com';
  let companyEmail = _orders[idx].company?.email || _orders[idx].companyEmail || '';
  let simulateFailure = false;

  if (typeof options === 'object' && options !== null) {
    reason = (options.rejectReason || _orders[idx].rejectReason || '').trim();
    if (options.subject) emailSubject = options.subject.trim();
    if (options.body) emailBody = options.body.trim();
    if (options.from) adminEmail = options.from.trim();
    if (options.to) companyEmail = options.to.trim();
    simulateFailure = options.simulateFailure === true;
  } else if (typeof options === 'string') {
    reason = options.trim();
  }

  // Acceptance Check: Rejection reason is required
  if (!reason) {
    throw new Error('Rejection reason is required.');
  }
  if (reason.length > 500) {
    throw new Error('Rejection reason cannot exceed 500 characters.');
  }

  // 1. UPDATE ORDER STATUS AND SAVE REASON
  const decidedAt = new Date().toISOString();
  _orders[idx] = {
    ..._orders[idx],
    status: 'REJECTED',
    rejectReason: reason,
    decidedAt,
    emailSentTo: companyEmail,
    emailSentFrom: adminEmail,
    emailSubject,
    emailBody
  };

  // 2. DISPATCH SERVER-SIDE DECLINE EMAIL
  let emailSent = false;
  let emailLog = null;
  let emailError = null;

  try {
    const res = await fetch(`/api/v1/admin/orders/${numericId}/send-decision-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(simulateFailure ? { 'x-simulate-email-failure': 'true' } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        orderId: numericId,
        type: 'rejected',
        to: companyEmail,
        from: adminEmail,
        subject: emailSubject,
        body: emailBody,
        simulateFailure
      })
    });

    if (res.ok) {
      const json = await res.json();
      emailSent = json.emailSent === true;
      emailLog = json.log || null;
      if (!emailSent) {
        emailError = json.error || 'Status updated, but email failed to send';
      }
    } else {
      emailSent = false;
      emailError = 'Status updated, but email failed to send';
    }
  } catch (err) {
    console.warn('[orderService] Server-side email failed or offline, recording local status:', err.message);
    emailSent = false;
    emailError = 'Status updated, but email failed to send';
  }

  // 3. RECORD AUDIT EMAIL LOG
  const logEntry = emailLog || {
    order_id: numericId,
    type: 'rejected',
    to: companyEmail,
    from: adminEmail,
    subject: emailSubject,
    body: emailBody,
    status: emailSent ? 'sent' : 'failed',
    error: emailError,
    sent_at: new Date().toISOString()
  };
  _emailLogs.unshift(logEntry);

  _orders[idx] = {
    ..._orders[idx],
    emailDispatched: emailSent,
    emailStatus: emailSent ? 'sent' : 'failed',
    emailDispatchedAt: logEntry.sent_at,
    emailLog: logEntry,
    emailLastError: emailError
  };

  return {
    order: _orders[idx],
    emailSent,
    error: emailError
  };
}

/**
 * Resend the booking status notification email to the B2B corporate client.
 * @param {number|string} orderId
 * @param {Object} [options]
 */
export async function resendOrderEmail(orderId, { simulateFailure = false } = {}) {
  const numericId = Number(orderId);
  const idx = _orders.findIndex((o) => o.orderId === numericId);
  if (idx === -1) throw new Error('Order not found.');

  const order = _orders[idx];
  if (order.status === 'RECEIVED') {
    throw new Error('Only accepted or rejected orders can resend email.');
  }

  const companyEmail = order.company?.email || order.companyEmail || order.emailSentTo || '';
  if (!companyEmail) {
    throw new Error('Company email missing, add it before sending');
  }

  const adminEmail = order.emailSentFrom || 'admin@hired.com';
  const emailSubject = order.emailSubject || `Order #${order.orderId} ${order.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'}`;
  const emailBody = order.emailBody || '';

  let emailSent = false;
  let emailLog = null;
  let emailError = null;

  try {
    const res = await fetch(`/api/v1/admin/orders/${numericId}/send-decision-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(simulateFailure ? { 'x-simulate-email-failure': 'true' } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        orderId: numericId,
        type: order.status.toLowerCase(),
        to: companyEmail,
        from: adminEmail,
        subject: emailSubject,
        body: emailBody,
        simulateFailure
      })
    });

    if (res.ok) {
      const json = await res.json();
      emailSent = json.emailSent === true;
      emailLog = json.log || null;
      if (!emailSent) emailError = json.error || 'Email resend failed';
    } else {
      emailSent = false;
      emailError = 'Email resend failed';
    }
  } catch (err) {
    emailSent = false;
    emailError = err.message;
  }

  const logEntry = emailLog || {
    order_id: numericId,
    type: order.status.toLowerCase(),
    to: companyEmail,
    from: adminEmail,
    subject: emailSubject,
    body: emailBody,
    status: emailSent ? 'sent' : 'failed',
    error: emailError,
    sent_at: new Date().toISOString()
  };
  _emailLogs.unshift(logEntry);

  _orders[idx] = {
    ..._orders[idx],
    emailDispatched: emailSent,
    emailStatus: emailSent ? 'sent' : 'failed',
    emailDispatchedAt: logEntry.sent_at,
    emailLog: logEntry,
    emailLastError: emailError
  };

  return {
    order: _orders[idx],
    emailSent,
    error: emailError
  };
}
