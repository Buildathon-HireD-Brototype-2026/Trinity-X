/**
 * orderService.js
 * Service layer for Orders & Enquiries Inbox.
 * Connected directly to backend PostgreSQL via apiClient.
 */
import apiClient from '../../services/apiClient';

let _sessionEmailLogs = [];

export function getEmailLogs() {
  return [..._sessionEmailLogs];
}

export function getEmailLogByOrderId(orderId) {
  return _sessionEmailLogs.filter((l) => l.order_id === Number(orderId));
}

/**
 * Fetch list of orders with optional filters
 * @param {Object} options
 * @param {string} [options.status]
 * @param {string} [options.source]
 * @param {string} [options.search]
 * @returns {Promise<Array>}
 */
export async function getOrders({ status = 'ALL', source = 'ALL', search = '' } = {}) {
  const queryParams = new URLSearchParams();
  if (status && status !== 'ALL') queryParams.append('status', status);
  if (source && source !== 'ALL') queryParams.append('source', source);
  if (search && search.trim()) queryParams.append('search', search.trim());

  const qs = queryParams.toString();
  const url = `/admin/orders${qs ? `?${qs}` : ''}`;
  const res = await apiClient.get(url);
  const items = res?.data || [];
  if (!Array.isArray(items)) return [];

  return items.map((o) => {
    const oId = o.orderId || o.order_id || o.id;
    return {
      ...o,
      orderId: oId,
      id: o.id || `ORD-${oId}`,
      company: o.company || {
        name: o.companyName || 'Corporate Client',
        email: o.companyEmail || o.company?.emailId || ''
      },
      companyName: o.company?.name || o.companyName || 'Corporate Client',
      companyEmail: o.company?.emailId || o.company?.email || o.companyEmail || '',
      pickupSpot: o.pickupSpot || o.pickup_spot || '',
      dropoffSpot: o.dropoffSpot || o.dropoff_spot || '',
      pickupTime: o.pickupTime || o.scheduledDate || o.created_at || '',
      status: o.status || 'RECEIVED',
      tripAmount: o.trip?.amount || o.tripAmount || null,
      driverName: o.trip?.driver?.name || o.driverName || null,
      estimatedFare: o.estimatedFare || o.estimated_fare || 0,
      vehicleType: o.vehicleType || o.vehicle_type || 'Sedan',
      notes: o.notes || '',
      contactName: o.contactName || o.contact_name || '',
      contactPhone: o.contactPhone || o.contact_phone || '',
      source: o.source || 'B2B_PORTAL'
    };
  });
}

/**
 * Get active client companies for manual order creation
 */
export async function getActiveCompanies() {
  const res = await apiClient.get('/admin/companies?status=ACTIVE');
  const data = res?.data || [];
  return Array.isArray(data) ? data : [];
}

/**
 * Create a new order manually on behalf of a company
 */
export async function createManualOrder(orderData) {
  const payload = {
    companyId: Number(orderData.companyId),
    pickupSpot: (orderData.pickupSpot || '').trim(),
    dropoffSpot: (orderData.dropoffSpot || '').trim(),
    pickupLatitude: orderData.pickupLatitude ?? null,
    pickupLongitude: orderData.pickupLongitude ?? null,
    dropLatitude: orderData.dropLatitude ?? null,
    dropLongitude: orderData.dropLongitude ?? null,
    pickupTime: orderData.pickupTime || new Date().toISOString(),
    contactName: (orderData.contactName || '').trim(),
    contactPhone: (orderData.contactPhone || '').trim(),
    vehicleType: orderData.vehicleType || 'Sedan',
    notes: (orderData.notes || '').trim(),
    estimatedFare: Number(orderData.estimatedFare || 0),
    source: orderData.source || 'PHONE'
  };

  const res = await apiClient.post('/admin/orders', payload);
  return res?.data;
}

/**
 * Accept an incoming order
 * @param {number|string} orderId
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function acceptOrder(orderId, tripAmountOrOptions = {}, maybeOptions = {}) {
  const numericId = Number(orderId);
  let options = {};
  let fare = null;

  if (typeof tripAmountOrOptions === 'object' && tripAmountOrOptions !== null) {
    options = tripAmountOrOptions;
    if (options.tripAmount) fare = Number(options.tripAmount);
  } else if (typeof tripAmountOrOptions === 'number' || typeof tripAmountOrOptions === 'string') {
    fare = Number(tripAmountOrOptions);
    options = typeof maybeOptions === 'object' && maybeOptions !== null ? maybeOptions : {};
  }

  const payload = {
    driverName: options.driverName || undefined,
    driverId: options.driverId || undefined,
    tripAmount: fare || options.amount || undefined,
    pickupLatitude: options.pickupLatitude,
    pickupLongitude: options.pickupLongitude,
    dropLatitude: options.dropLatitude,
    dropLongitude: options.dropLongitude
  };

  const res = await apiClient.post(`/admin/orders/${numericId}/accept`, payload);

  let emailSent = false;
  // Attempt to notify client via email dispatch if endpoint is supported
  try {
    const emailRes = await apiClient.post(`/admin/orders/${numericId}/send-decision-email`, {
      orderId: numericId,
      type: 'accepted',
      to: options.to,
      from: options.from,
      subject: options.subject,
      body: options.body,
      driverName: options.driverName
    });
    emailSent = emailRes?.emailSent === true;
  } catch {
    // Decision email endpoint may be optional or in development
    emailSent = false;
  }

  const updatedOrder = res?.data || {
    orderId: numericId,
    status: 'ACCEPTED',
    driverName: options.driverName,
    tripAmount: fare
  };

  const logEntry = {
    order_id: numericId,
    type: 'accepted',
    to: options.to || '',
    from: options.from || 'admin@hired.com',
    subject: options.subject || `Order #${numericId} Accepted`,
    body: options.body || '',
    status: emailSent ? 'sent' : 'failed',
    sent_at: new Date().toISOString()
  };
  _sessionEmailLogs.unshift(logEntry);

  return {
    order: updatedOrder,
    emailSent
  };
}

/**
 * Reject an incoming order
 * @param {number|string} orderId
 * @param {Object|string} options
 */
export async function rejectOrder(orderId, options = {}) {
  const numericId = Number(orderId);
  let reason = '';
  let emailSubject = `Order #${numericId} Rejected`;
  let emailBody = '';
  let adminEmail = 'admin@hired.com';
  let companyEmail = '';

  if (typeof options === 'object' && options !== null) {
    reason = (options.rejectReason || options.reason || '').trim();
    if (options.subject) emailSubject = options.subject.trim();
    if (options.body) emailBody = options.body.trim();
    if (options.from) adminEmail = options.from.trim();
    if (options.to) companyEmail = options.to.trim();
  } else if (typeof options === 'string') {
    reason = options.trim();
  }

  const res = await apiClient.post(`/admin/orders/${numericId}/reject`, {
    reason
  });

  let emailSent = false;
  try {
    const emailRes = await apiClient.post(`/admin/orders/${numericId}/send-decision-email`, {
      orderId: numericId,
      type: 'rejected',
      to: companyEmail,
      from: adminEmail,
      subject: emailSubject,
      body: emailBody,
      rejectReason: reason
    });
    emailSent = emailRes?.emailSent === true;
  } catch {
    emailSent = false;
  }

  const updatedOrder = res?.data || {
    orderId: numericId,
    status: 'REJECTED',
    rejectReason: reason
  };

  const logEntry = {
    order_id: numericId,
    type: 'rejected',
    to: companyEmail,
    from: adminEmail,
    subject: emailSubject,
    body: emailBody,
    status: emailSent ? 'sent' : 'failed',
    sent_at: new Date().toISOString()
  };
  _sessionEmailLogs.unshift(logEntry);

  return {
    order: updatedOrder,
    emailSent
  };
}

/**
 * Resend order notification email
 */
export async function resendOrderEmail(orderId, options = {}) {
  const numericId = Number(orderId);
  let emailSent = false;
  try {
    const res = await apiClient.post(`/admin/orders/${numericId}/send-decision-email`, {
      orderId: numericId,
      ...options
    });
    emailSent = res?.emailSent === true;
  } catch {
    emailSent = false;
  }

  return {
    order: { orderId: numericId },
    emailSent
  };
}

/**
 * Fetch eligible drivers available for a specific order and scheduled date.
 * Queries the real backend eligibility endpoint with zero mock data.
 * @param {number|string} orderId
 * @param {string} [orderDate]
 * @returns {Promise<Array>} List of eligible driver objects
 */
export async function getEligibleDrivers(orderId, orderDate) {
  const cleanId = String(orderId).replace(/\D/g, '') || orderId;
  const url = `/admin/orders/${cleanId}/eligible-drivers` +
    (orderDate ? `?date=${encodeURIComponent(orderDate)}` : '');

  try {
    const res = await apiClient.get(url);
    const data = res?.data || [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
