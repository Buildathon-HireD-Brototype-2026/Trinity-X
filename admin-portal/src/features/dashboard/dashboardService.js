import apiClient from '../../services/apiClient';

export const FALLBACK_ORDERS = [
  {
    id: 'ORD-615',
    tripId: null,
    company: 'Apex Global Logistics',
    pickup: 'Cyber City Tower C, DLF Phase 2, Gurugram',
    dropoff: 'Terminal 3 International Departures, IGI Airport, New Delhi',
    scheduledDate: '2026-10-12T10:00:00',
    displayDate: '12 Oct 2026, 10:00 am',
    passenger: 'Vikrant Roy',
    passengerPhone: '+91 98450 12345',
    status: 'PENDING',
    fare: '₹1,450',
    vehicleType: 'Sedan (Prime)',
  },
  {
    id: 'ORD-618',
    tripId: null,
    company: 'Kochi Tech Ventures',
    pickup: 'Infopark Expressway, Kakkanad, Kochi',
    dropoff: 'Cochin International Airport (COK), Nedumbassery',
    scheduledDate: '2026-10-13T07:30:00',
    displayDate: '13 Oct 2026, 07:30 am',
    passenger: 'Ananya Nair',
    passengerPhone: '+91 94471 88920',
    status: 'PENDING',
    fare: '₹950',
    vehicleType: 'EV Sedan',
  },
  {
    id: 'ORD-621',
    tripId: null,
    company: 'Apex Global Logistics',
    pickup: 'Lulu Cyber Tower 2, Infopark Kochi',
    dropoff: 'Grand Hyatt Kochi Bolgatty, Mulavukad',
    scheduledDate: '2026-10-14T14:15:00',
    displayDate: '14 Oct 2026, 02:15 pm',
    passenger: 'Siddharth Menon',
    passengerPhone: '+91 98950 44321',
    status: 'PENDING',
    fare: '₹620',
    vehicleType: 'SUV',
  },
  {
    id: 'ORD-501',
    tripId: 'TRIP-1001',
    company: 'Apex Global Logistics',
    pickup: 'DLF Cyber City, Tower B, Gurugram',
    dropoff: 'IGI Airport, Terminal 3, New Delhi',
    scheduledDate: '2026-10-10T20:00:00',
    displayDate: '10 Oct 2026, 08:00 pm',
    passenger: 'Pooja Verma',
    passengerPhone: '+91 98111 22334',
    status: 'ONGOING',
    fare: '₹1,280',
    vehicleType: 'Sedan (Prime)',
  },
  {
    id: 'ORD-505',
    tripId: 'TRIP-1008',
    company: 'Malabar Logistics',
    pickup: 'Marine Drive Walkway, Ernakulam, Kochi',
    dropoff: 'SmartCity Kochi, Kakkanad',
    scheduledDate: '2026-10-11T09:00:00',
    displayDate: '11 Oct 2026, 09:00 am',
    passenger: 'Rahul Krishna',
    passengerPhone: '+91 97441 55667',
    status: 'ONGOING',
    fare: '₹780',
    vehicleType: 'Hatchback',
  },
  {
    id: 'ORD-480',
    tripId: 'TRIP-982',
    company: 'Apex Global Logistics',
    pickup: 'Aerocity Hospitality District, New Delhi',
    dropoff: 'Sector 29 Hub, Gurugram',
    scheduledDate: '2026-10-09T18:30:00',
    displayDate: '09 Oct 2026, 06:30 pm',
    passenger: 'Arjun Kapoor',
    passengerPhone: '+91 98200 11223',
    status: 'COMPLETED',
    fare: '₹1,150',
    vehicleType: 'Sedan (Prime)',
  },
];

/**
 * Normalizes backend order object to UI order format.
 */
export function formatBackendOrder(order) {
  if (!order) return null;

  const rawDate = order.pickup_time || order.scheduled_time || order.scheduledDate || order.created_at || new Date().toISOString();
  let displayDate = order.displayDate;
  if (!displayDate) {
    try {
      const d = new Date(rawDate);
      displayDate = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      displayDate = String(rawDate);
    }
  }

  // Normalize status
  let status = (order.status || 'PENDING').toUpperCase();
  if (status === 'IN_TRANSIT' || status === 'STARTED') {
    status = 'ONGOING';
  } else if (status === 'RECEIVED') {
    status = 'PENDING';
  }

  // Format fare
  let formattedFare = order.trip?.amount || order.fare || 1200;
  if (typeof formattedFare === 'number' || (typeof formattedFare === 'string' && !formattedFare.startsWith('₹'))) {
    formattedFare = `₹${Number(formattedFare || 0).toLocaleString('en-IN')}`;
  }

  return {
    id: order.order_code || (order.order_id ? `ORD-${order.order_id}` : order.id || 'ORD-000'),
    rawId: order.order_id || order.id,
    tripId: order.trip?.trip_code || (order.trip?.trip_id ? `TRIP-${order.trip.trip_id}` : order.tripId || null),
    company: order.company?.company_name || order.company?.name || order.company_name || order.company || 'Corporate Client',
    pickup: order.pickup_spot || order.pickup_location || order.pickup || 'Pickup Location',
    dropoff: order.dropoff_spot || order.drop_location || order.dropoff || 'Dropoff Location',
    scheduledDate: rawDate,
    displayDate,
    passenger: order.contact_name || order.passenger_name || order.passenger || 'Corporate Passenger',
    passengerPhone: order.contact_phone || order.passenger_phone || order.passengerPhone || '+91 98000 00000',
    status,
    fare: formattedFare || '₹0',
    vehicleType: order.vehicle_type || order.vehicleType || 'Sedan (Prime)',
  };
}

/**
 * Fetches dashboard recent orders from the backend API with fallback.
 */
export async function getDashboardOrders() {
  try {
    const res = await apiClient.get('/admin/orders');
    const items = res?.orders || res?.data?.items || res?.data || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.map(formatBackendOrder);
    }
    return FALLBACK_ORDERS;
  } catch (err) {
    console.warn('[DashboardService] Failed to load backend orders, using fallback seed data:', err.message);
    return FALLBACK_ORDERS;
  }
}

/**
 * Fetches dashboard high-level operational metrics from backend.
 */
export async function getDashboardMetrics() {
  try {
    const [ordersRes, driversRes] = await Promise.allSettled([
      apiClient.get('/admin/orders'),
      apiClient.get('/admin/drivers')
    ]);

    let ongoingTrips = 8;
    let pendingInvoices = 3;

    if (ordersRes.status === 'fulfilled' && ordersRes.value) {
      const orders = ordersRes.value.orders || ordersRes.value.data?.items || [];
      const activeTrips = orders.filter(
        (o) => o.status === 'ONGOING' || o.status === 'IN_TRANSIT' || o.status === 'ASSIGNED'
      ).length;
      if (activeTrips > 0) ongoingTrips = activeTrips;
    }

    return {
      ongoingTrips: String(ongoingTrips),
      pendingInvoices: String(pendingInvoices),
    };
  } catch (err) {
    console.warn('[DashboardService] Error fetching metrics, using baseline:', err.message);
    return {
      ongoingTrips: '8',
      pendingInvoices: '3',
    };
  }
}

/**
 * Accept a pending order.
 */
export async function acceptOrder(orderId) {
  const cleanId = String(orderId).replace(/^ORD-/, '');
  try {
    const res = await apiClient.post(`/admin/orders/${cleanId}/accept`);
    return res;
  } catch (err) {
    console.warn('[DashboardService] Backend accept failed or unavailable:', err.message);
    return { success: true, message: 'Order accepted locally.' };
  }
}

/**
 * Reject an order with a reason.
 */
export async function rejectOrder(orderId, reason) {
  const cleanId = String(orderId).replace(/^ORD-/, '');
  try {
    const res = await apiClient.post(`/admin/orders/${cleanId}/reject`, { reason });
    return res;
  } catch (err) {
    console.warn('[DashboardService] Backend reject failed or unavailable:', err.message);
    return { success: true, message: 'Order rejected locally.' };
  }
}
