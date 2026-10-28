import apiClient from '../../services/apiClient';

/**
 * Normalizes backend order object to UI order format safely.
 */
export function formatBackendOrder(order) {
  if (!order) return null;

  const rawDate =
    order.pickupTime ||
    order.pickup_time ||
    order.createdAt ||
    order.created_at ||
    new Date().toISOString();

  let displayDate = '—';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      displayDate = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch {
    displayDate = String(rawDate || '—');
  }

  // Normalize status
  let status = String(order.status || 'PENDING').toUpperCase();
  if (status === 'IN_TRANSIT' || status === 'STARTED') {
    status = 'ONGOING';
  } else if (status === 'RECEIVED') {
    status = 'PENDING';
  }

  // Format fare safely
  const rawFare = order.trip?.amount !== undefined ? order.trip.amount : order.estimatedFare;
  let formattedFare = '—';
  if (rawFare !== null && rawFare !== undefined && !isNaN(Number(rawFare))) {
    formattedFare = `₹${Number(rawFare).toLocaleString('en-IN')}`;
  }

  const orderNum = order.orderId || order.order_id;

  return {
    id: orderNum ? `ORD-${orderNum}` : 'ORD-0',
    rawId: orderNum || null,
    orderId: orderNum || null,
    tripId: order.trip?.tripId ? `TRP-${order.trip.tripId}` : (order.trip?.trip_id ? `TRP-${order.trip.trip_id}` : null),
    company: order.company?.name || order.company?.company_name || 'Corporate Client',
    companyName: order.company?.name || order.company?.company_name || 'Corporate Client',
    companyEmail: order.company?.emailId || order.company?.email_id || order.company?.email || '',
    pickup: order.pickupSpot || order.pickup_spot || '—',
    pickupSpot: order.pickupSpot || order.pickup_spot || '—',
    dropoff: order.dropoffSpot || order.dropoff_spot || '—',
    dropoffSpot: order.dropoffSpot || order.dropoff_spot || '—',
    scheduledDate: rawDate,
    pickupTime: rawDate,
    displayDate,
    passenger: order.contactName || order.contact_name || '—',
    passengerPhone: order.contactPhone || order.contact_phone || '—',
    status,
    fare: formattedFare,
    vehicleType: order.vehicleType || order.vehicle_type || 'Sedan (Prime)',
    notes: order.notes || null,
    rejectReason: order.rejectReason || order.reject_reason || null,
  };
}

/**
 * Fetches dashboard recent orders directly from backend API.
 * Returns empty array when database is empty (NEVER mock data).
 */
export async function getDashboardOrders() {
  const res = await apiClient.get('/admin/orders');
  const items = res?.orders || res?.data?.items || res?.data || [];
  if (Array.isArray(items)) {
    return items.map(formatBackendOrder).filter(Boolean);
  }
  return [];
}

/**
 * Fetches live operational metrics from backend database.
 */
export async function getDashboardMetrics() {
  let ongoingTrips = 0;
  let pendingInvoices = 0;

  const [ordersRes, invoicesRes] = await Promise.allSettled([
    apiClient.get('/admin/orders'),
    apiClient.get('/admin/invoices'),
  ]);

  if (ordersRes.status === 'fulfilled' && ordersRes.value) {
    const orders = ordersRes.value.orders || ordersRes.value.data?.items || [];
    if (Array.isArray(orders)) {
      ongoingTrips = orders.filter((o) => {
        const orderStatus = (o.status || '').toUpperCase();
        const tripStatus = (o.trip?.tripStatus || o.trip?.status || '').toUpperCase();
        return (
          orderStatus === 'ONGOING' ||
          orderStatus === 'IN_TRANSIT' ||
          tripStatus === 'ONGOING' ||
          tripStatus === 'IN_TRANSIT' ||
          tripStatus === 'STARTED'
        );
      }).length;
    }
  }

  if (invoicesRes.status === 'fulfilled' && invoicesRes.value) {
    const invoices = invoicesRes.value.invoices || invoicesRes.value.data?.items || invoicesRes.value.data || [];
    if (Array.isArray(invoices)) {
      pendingInvoices = invoices.filter((inv) => {
        const s = (inv.status || '').toUpperCase();
        return s === 'DRAFT' || s === 'PENDING_APPROVAL_1' || s === 'PENDING_APPROVAL_2';
      }).length;
    }
  }

  return {
    ongoingTrips: String(ongoingTrips),
    pendingInvoices: String(pendingInvoices),
  };
}

/**
 * Accept a pending order via backend API.
 */
export async function acceptOrder(orderId) {
  const cleanId = String(orderId).replace(/^ORD-/, '');
  return apiClient.post(`/admin/orders/${cleanId}/accept`);
}

/**
 * Reject an order with a reason via backend API.
 */
export async function rejectOrder(orderId, reason) {
  const cleanId = String(orderId).replace(/^ORD-/, '');
  return apiClient.post(`/admin/orders/${cleanId}/reject`, { reason });
}
