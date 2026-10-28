/**
 * tripService.js
 * Service layer for Trips Management & Driver Assignment Dispatch.
 * Connected directly to backend PostgreSQL via apiClient.
 */
import apiClient from '../../services/apiClient';

/**
 * Fetch list of trips with live search, status, and vehicle filters
 * @param {Object} options
 * @param {string} [options.status]
 * @param {string} [options.vehicleType]
 * @param {string} [options.search]
 * @returns {Promise<Array>}
 */
export async function getTrips({ status = 'ALL', vehicleType = 'ALL', search = '' } = {}) {
  // Query orders from backend, which include trip and driver relations
  const res = await apiClient.get('/admin/orders');
  const orders = Array.isArray(res?.data) ? res.data : [];

  const trips = [];
  for (const o of orders) {
    if (o.trip) {
      const trip = o.trip;
      const tripStatus = trip.status || trip.trip_status || 'UNASSIGNED';
      const tripVehicle = o.vehicle_type || o.vehicleType || 'Sedan';

      trips.push({
        tripId: trip.trip_id || trip.tripId,
        orderId: o.order_id || o.orderId,
        companyId: o.company_id || o.companyId,
        companyName: o.company_name || o.company?.name || 'Corporate Client',
        hiredSplit: o.company?.hired_split || 20,
        driverSplit: o.company?.driver_split || 80,
        passengerName: o.contact_name || o.contactName || '',
        passengerPhone: o.contact_phone || o.contactPhone || '',
        pickupSpot: o.pickup_spot || o.pickupSpot || '',
        dropoffSpot: o.dropoff_spot || o.dropoffSpot || '',
        pickupTime: o.pickup_time || o.pickupTime || '',
        vehicleType: tripVehicle,
        notes: o.notes || '',
        amount: Number(trip.amount || 0),
        driverId: trip.driver_id || trip.driverId || null,
        driverName: trip.driver_name || trip.driver?.name || null,
        driverPhone: trip.driver_phone || trip.driver?.phoneNo || null,
        vehicleNumber: trip.driver?.vehicleNumber || '—',
        vehicleModel: trip.driver?.vehicleModel || tripVehicle,
        driverEarning: trip.driverEarning || null,
        platformCommission: trip.platformCommission || null,
        otp: trip.otp || '******',
        otpAttempts: trip.otp_attempts || 0,
        expensesConfirmed: trip.expenses_confirmed || false,
        tripStatus,
        assignedAt: trip.assigned_at,
        startedAt: trip.started_at,
        closedAt: trip.closed_at,
        cancelReason: trip.cancel_reason || null,
        createdAt: trip.created_at || o.created_at
      });
    }
  }

  let filtered = trips;

  if (status !== 'ALL') {
    if (status === 'UNASSIGNED') {
      filtered = filtered.filter((t) => t.tripStatus === 'UNASSIGNED' || t.tripStatus === 'ASSIGNMENT_PENDING');
    } else {
      filtered = filtered.filter((t) => t.tripStatus === status);
    }
  }

  if (vehicleType !== 'ALL') {
    filtered = filtered.filter(
      (t) => (t.vehicleType || '').toLowerCase() === vehicleType.toLowerCase()
    );
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        `trp-${t.tripId}`.toLowerCase().includes(q) ||
        String(t.tripId).includes(q) ||
        `ord-${t.orderId}`.toLowerCase().includes(q) ||
        (t.companyName || '').toLowerCase().includes(q) ||
        (t.passengerName || '').toLowerCase().includes(q) ||
        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
        (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
        (t.pickupSpot || '').toLowerCase().includes(q) ||
        (t.dropoffSpot || '').toLowerCase().includes(q)
    );
  }

  return filtered.sort((a, b) => {
    const isUnassignedA = a.tripStatus === 'UNASSIGNED' || a.tripStatus === 'ASSIGNMENT_PENDING';
    const isUnassignedB = b.tripStatus === 'UNASSIGNED' || b.tripStatus === 'ASSIGNMENT_PENDING';
    if (isUnassignedA && !isUnassignedB) return -1;
    if (!isUnassignedA && isUnassignedB) return 1;
    return b.tripId - a.tripId;
  });
}

/**
 * Fetch verified, active drivers eligible for assignment matching vehicle class
 * @param {Object} [options]
 * @param {string} [options.vehicleType]
 * @returns {Promise<Array>}
 */
export async function getEligibleDrivers({ vehicleType = 'ALL' } = {}) {
  const queryParams = new URLSearchParams();
  queryParams.append('status', 'ACTIVE');
  if (vehicleType && vehicleType !== 'ALL') {
    queryParams.append('vehicleType', vehicleType);
  }

  const res = await apiClient.get(`/admin/drivers?${queryParams.toString()}`);
  const items = res?.data?.items || res?.data || [];
  if (!Array.isArray(items)) return [];

  return items.map((d) => ({
    driverId: d.driver_id || d.driverId,
    name: d.name,
    phoneNo: d.phone_no || d.phoneNo,
    vehicleType: d.vehicleType || 'Sedan',
    vehicleModel: d.vehicleModel || 'Standard',
    vehicleNumber: d.vehicleNumber || '—',
    rating: d.rating || 5.0,
    completedTrips: d.completedTrips || 0,
    status: d.status,
    isOnline: d.is_online || d.isOnline || false,
    currentLocation: d.current_location || d.currentLocation || 'Bengaluru'
  }));
}

/**
 * Assign a driver to an unassigned trip
 * @param {number|string} tripId
 * @param {number|string} driverId
 * @returns {Promise<Object>}
 */
export async function assignDriverToTrip(tripId, driverId) {
  const numericTripId = Number(tripId);
  const numericDriverId = Number(driverId);

  if (!numericTripId || !numericDriverId) {
    throw new Error('Please select both a valid trip and an active driver.');
  }

  const res = await apiClient.post(`/admin/trips/${numericTripId}/assign-driver`, {
    driverId: numericDriverId
  });

  return res?.data || {
    tripId: numericTripId,
    driverId: numericDriverId,
    tripStatus: 'DRIVER_ASSIGNED'
  };
}

/**
 * Progress trip lifecycle state
 * @param {number|string} tripId
 * @param {string} nextStatus
 * @param {Object} [metadata]
 * @returns {Promise<Object>}
 */
export async function updateTripStatus(tripId, nextStatus, metadata = {}) {
  const numericTripId = Number(tripId);

  const payload = {
    tripStatus: nextStatus,
    ...metadata
  };

  const res = await apiClient.patch(`/admin/trips/${numericTripId}`, payload);
  return res?.data || {
    tripId: numericTripId,
    tripStatus: nextStatus,
    ...metadata
  };
}
