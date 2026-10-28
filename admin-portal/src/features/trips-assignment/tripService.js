/**
 * tripService.js
 * Service layer for Trips Management & Driver Assignment Dispatch (PRD A-06, A-07).
 * Aligned with PostgreSQL / Prisma models: Trip, Order, Driver, Company.
 * Operates with live API fallback to an in-memory client store.
 */

// ---------------------------------------------------------------------------
// Seed Data — Verified & Active Fleet Drivers (PRD A-06)
// ---------------------------------------------------------------------------
let _drivers = [
  {
    driverId: 101,
    name: 'Rajesh Kannan',
    phoneNo: '+91 98451 23456',
    vehicleType: 'Sedan',
    vehicleModel: 'Maruti Suzuki Dzire',
    vehicleNumber: 'KA-01-AB-1234',
    rating: 4.9,
    completedTrips: 184,
    status: 'ACTIVE',
    isOnline: true,
    currentLocation: 'Whitefield Main Road, Bengaluru',
    photoURL: null
  },
  {
    driverId: 102,
    name: 'Mohammed Farooq',
    phoneNo: '+91 98765 67890',
    vehicleType: 'Sedan',
    vehicleModel: 'Toyota Etios',
    vehicleNumber: 'KA-03-CD-5678',
    rating: 4.95,
    completedTrips: 312,
    status: 'ACTIVE',
    isOnline: true,
    currentLocation: 'Indiranagar 100ft Rd, Bengaluru',
    photoURL: null
  },
  {
    driverId: 103,
    name: 'Anil Kumar Gowda',
    phoneNo: '+91 98112 34567',
    vehicleType: 'SUV',
    vehicleModel: 'Toyota Innova Crysta',
    vehicleNumber: 'KA-04-EF-9012',
    rating: 4.85,
    completedTrips: 245,
    status: 'ACTIVE',
    isOnline: true,
    currentLocation: 'Electronic City Toll Plaza, Bengaluru',
    photoURL: null
  },
  {
    driverId: 104,
    name: 'Suresh Babu',
    phoneNo: '+91 98223 45678',
    vehicleType: 'Hatchback',
    vehicleModel: 'Maruti Suzuki WagonR',
    vehicleNumber: 'KA-05-GH-3456',
    rating: 4.7,
    completedTrips: 98,
    status: 'ACTIVE',
    isOnline: true,
    currentLocation: 'Koramangala 4th Block, Bengaluru',
    photoURL: null
  },
  {
    driverId: 105,
    name: 'Venkatesh Prasad',
    phoneNo: '+91 98334 56789',
    vehicleType: 'SUV',
    vehicleModel: 'Mahindra XUV700',
    vehicleNumber: 'KA-51-JK-7890',
    rating: 4.92,
    completedTrips: 410,
    status: 'ACTIVE',
    isOnline: true,
    currentLocation: 'Bellandur EcoSpace Gate 1, Bengaluru',
    photoURL: null
  }
];

// ---------------------------------------------------------------------------
// Seed Data — Trips Aligned with Prisma models Trip, Order, Company
// ---------------------------------------------------------------------------
let _trips = [
  {
    tripId: 2001,
    orderId: 1003,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Vikram Malhotra',
    passengerPhone: '+91 98112 55667',
    pickupSpot: 'Outer Ring Road, Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'MG Road Trinity Metro Station, Bengaluru',
    pickupTime: '2026-10-21T14:15:00Z',
    vehicleType: 'Sedan',
    notes: 'Inter-office executive travel. Priority dispatch.',
    amount: 1850.00,
    driverId: null,
    driverName: null,
    driverPhone: null,
    vehicleNumber: null,
    vehicleModel: null,
    driverEarning: 1480.00, // 80%
    platformCommission: 370.00, // 20%
    otp: '482910',
    otpAttempts: 0,
    expensesConfirmed: false,
    tripStatus: 'UNASSIGNED', // 'UNASSIGNED' | 'ASSIGNMENT_PENDING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
    assignedAt: null,
    startedAt: null,
    closedAt: null,
    cancelReason: null,
    createdAt: '2026-10-21T06:00:00Z'
  },
  {
    tripId: 2002,
    orderId: 1002,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Shreya Sengupta',
    passengerPhone: '+91 98765 22334',
    pickupSpot: 'Indiranagar 100ft Rd Metro Station, Bengaluru',
    dropoffSpot: 'Electronic City Phase 1, Toll Plaza, Bengaluru',
    pickupTime: '2026-10-21T15:30:00Z',
    vehicleType: 'SUV',
    notes: 'Client site audit visit. 3 passengers with laptops.',
    amount: 2200.00,
    driverId: null,
    driverName: null,
    driverPhone: null,
    vehicleNumber: null,
    vehicleModel: null,
    driverEarning: 1760.00,
    platformCommission: 440.00,
    otp: '739104',
    otpAttempts: 0,
    expensesConfirmed: false,
    tripStatus: 'UNASSIGNED',
    assignedAt: null,
    startedAt: null,
    closedAt: null,
    cancelReason: null,
    createdAt: '2026-10-21T07:15:00Z'
  },
  {
    tripId: 2003,
    orderId: 1004,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    hiredSplit: 15.00,
    driverSplit: 85.00,
    passengerName: 'Meera Nambiar',
    passengerPhone: '+91 98223 77889',
    pickupSpot: 'HSR Layout Sector 1, Bengaluru',
    dropoffSpot: 'Manyata Embassy Business Park, Hebbal',
    pickupTime: '2026-10-21T16:00:00Z',
    vehicleType: 'Sedan',
    notes: 'Leadership review conference transfer.',
    amount: 1150.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    vehicleModel: 'Maruti Suzuki Dzire',
    driverEarning: 977.50, // 85%
    platformCommission: 172.50, // 15%
    otp: '519283',
    otpAttempts: 0,
    expensesConfirmed: false,
    tripStatus: 'DRIVER_ASSIGNED',
    assignedAt: '2026-10-21T07:30:00Z',
    startedAt: null,
    closedAt: null,
    cancelReason: null,
    createdAt: '2026-10-21T05:45:00Z'
  },
  {
    tripId: 2004,
    orderId: 1001,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Raghavan Iyer',
    passengerPhone: '+91 98450 11223',
    pickupSpot: 'Tech Park Gate 2, Whitefield, Bengaluru',
    dropoffSpot: 'Kempegowda International Airport (BLR), Terminal 2',
    pickupTime: '2026-10-21T09:30:00Z',
    vehicleType: 'Sedan',
    notes: 'Airport transfer for executive delegate.',
    amount: 1450.00,
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    vehicleModel: 'Toyota Etios',
    driverEarning: 1160.00,
    platformCommission: 290.00,
    otp: '820147',
    otpAttempts: 1,
    expensesConfirmed: false,
    tripStatus: 'IN_TRANSIT',
    assignedAt: '2026-10-21T08:00:00Z',
    startedAt: '2026-10-21T09:35:00Z',
    closedAt: null,
    cancelReason: null,
    createdAt: '2026-10-20T21:15:00Z'
  },
  {
    tripId: 2005,
    orderId: 998,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Kavita Menon',
    passengerPhone: '+91 98332 11098',
    pickupSpot: 'Koramangala 5th Block, Bengaluru',
    dropoffSpot: 'MG Road Metro Station, Bengaluru',
    pickupTime: '2026-10-21T07:00:00Z',
    vehicleType: 'SUV',
    notes: 'Morning management commute.',
    amount: 950.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    vehicleModel: 'Toyota Innova Crysta',
    driverEarning: 760.00,
    platformCommission: 190.00,
    otp: '603921',
    otpAttempts: 1,
    expensesConfirmed: true,
    tripStatus: 'COMPLETED',
    assignedAt: '2026-10-21T06:15:00Z',
    startedAt: '2026-10-21T07:05:00Z',
    closedAt: '2026-10-21T07:55:00Z',
    cancelReason: null,
    createdAt: '2026-10-20T18:00:00Z'
  }
];

let _nextTripId = 2006;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieve secure authentication and anti-CSRF headers.
 * Validates token expiration (fail-closed).
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
 * Fetch list of trips with live search, status, and vehicle filters
 * @param {Object} options
 * @param {string} [options.status] - 'ALL' | 'UNASSIGNED' | 'DRIVER_ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
 * @param {string} [options.vehicleType] - 'ALL' | 'Sedan' | 'SUV' | 'Hatchback'
 * @param {string} [options.search] - Query string
 * @returns {Promise<Array>}
 */
export async function getTrips({ status = 'ALL', vehicleType = 'ALL', search = '' } = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (status !== 'ALL') queryParams.append('status', status);
    if (vehicleType !== 'ALL') queryParams.append('vehicleType', vehicleType);
    if (search.trim()) queryParams.append('search', search.trim());

    const res = await fetch(`/api/v1/admin/trips?${queryParams.toString()}`, {
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
    // Fallback to client mock store
  }

  await delay(200);

  let filtered = [..._trips];

  if (status !== 'ALL') {
    if (status === 'UNASSIGNED') {
      filtered = filtered.filter((t) => t.tripStatus === 'UNASSIGNED' || t.tripStatus === 'ASSIGNMENT_PENDING');
    } else {
      filtered = filtered.filter((t) => t.tripStatus === status);
    }
  }

  if (vehicleType !== 'ALL') {
    filtered = filtered.filter(
      (t) => t.vehicleType.toLowerCase() === vehicleType.toLowerCase()
    );
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        `trp-${t.tripId}`.toLowerCase().includes(q) ||
        String(t.tripId).includes(q) ||
        `ord-${t.orderId}`.toLowerCase().includes(q) ||
        t.companyName.toLowerCase().includes(q) ||
        t.passengerName.toLowerCase().includes(q) ||
        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
        (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
        t.pickupSpot.toLowerCase().includes(q) ||
        t.dropoffSpot.toLowerCase().includes(q)
    );
  }

  // Sort: Unassigned first, then by trip ID descending
  return filtered.sort((a, b) => {
    const isUnassignedA = a.tripStatus === 'UNASSIGNED' || a.tripStatus === 'ASSIGNMENT_PENDING';
    const isUnassignedB = b.tripStatus === 'UNASSIGNED' || b.tripStatus === 'ASSIGNMENT_PENDING';
    if (isUnassignedA && !isUnassignedB) return -1;
    if (!isUnassignedA && isUnassignedB) return 1;
    return b.tripId - a.tripId;
  });
}

/**
 * Fetch verified, active drivers eligible for assignment matching vehicle class (PRD A-06)
 * @param {Object} [options]
 * @param {string} [options.vehicleType] - 'ALL' | 'Sedan' | 'SUV' | 'Hatchback'
 * @returns {Promise<Array>}
 */
export async function getEligibleDrivers({ vehicleType = 'ALL' } = {}) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('status', 'ACTIVE');
    if (vehicleType !== 'ALL') queryParams.append('vehicleType', vehicleType);

    const res = await fetch(`/api/v1/admin/drivers/eligible?${queryParams.toString()}`, {
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

  await delay(150);

  let eligible = _drivers.filter((d) => d.status === 'ACTIVE' && d.isOnline);

  if (vehicleType && vehicleType !== 'ALL') {
    eligible = eligible.filter(
      (d) => d.vehicleType.toLowerCase() === vehicleType.toLowerCase()
    );
  }

  return eligible;
}

/**
 * Assign a driver to an unassigned trip (PRD A-06)
 * @param {number|string} tripId
 * @param {number|string} driverId
 * @returns {Promise<Object>}
 */
export async function assignDriverToTrip(tripId, driverId) {
  const numericTripId = Number(tripId);
  const numericDriverId = Number(driverId);

  if (!numericTripId || !numericDriverId) {
    throw new Error('Both Trip ID and Driver ID are required for assignment.');
  }

  try {
    const res = await fetch(`/api/v1/admin/trips/${numericTripId}/assign-driver`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ driverId: numericDriverId })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(250);

  const tripIdx = _trips.findIndex((t) => t.tripId === numericTripId);
  if (tripIdx === -1) throw new Error('Trip not found.');

  const trip = _trips[tripIdx];

  // State Machine Guard: Trip must not already be in a terminal or in-transit state
  if (trip.tripStatus === 'COMPLETED' || trip.tripStatus === 'CANCELLED') {
    throw new Error(`Cannot assign driver to trip in terminal state (${trip.tripStatus}).`);
  }
  if (trip.tripStatus === 'IN_TRANSIT') {
    throw new Error('Cannot reassign driver while trip is already in transit.');
  }

  const driver = _drivers.find((d) => d.driverId === numericDriverId);
  if (!driver) throw new Error('Selected driver not found in fleet.');
  if (driver.status !== 'ACTIVE') {
    throw new Error(`Driver ${driver.name} is not active (Status: ${driver.status}).`);
  }
  if (!driver.isOnline) {
    throw new Error(`Driver ${driver.name} is currently offline and cannot be dispatched.`);
  }
  // Enforce vehicle class compatibility
  if (driver.vehicleType.toLowerCase() !== trip.vehicleType.toLowerCase()) {
    throw new Error(
      `Driver vehicle class (${driver.vehicleType}) does not match trip requirement (${trip.vehicleType}).`
    );
  }

  // Calculate earnings split with precision
  const fare = Number(trip.amount);
  const driverPercent = Number(trip.driverSplit || 80);
  const hiredPercent = Number(trip.hiredSplit || 20);
  const driverEarning = Number(((fare * driverPercent) / 100).toFixed(2));
  const platformCommission = Number(((fare * hiredPercent) / 100).toFixed(2));

  // Cryptographically secure 6-digit start trip OTP (CWE-338 mitigation)
  let generatedOtp;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    generatedOtp = String(100000 + (arr[0] % 900000));
  } else {
    generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  }

  _trips[tripIdx] = {
    ...trip,
    driverId: driver.driverId,
    driverName: driver.name,
    driverPhone: driver.phoneNo,
    vehicleNumber: driver.vehicleNumber,
    vehicleModel: driver.vehicleModel,
    vehicleType: driver.vehicleType,
    driverEarning,
    platformCommission,
    otp: generatedOtp,
    tripStatus: 'DRIVER_ASSIGNED',
    assignedAt: new Date().toISOString()
  };

  return _trips[tripIdx];
}

/**
 * Progress trip lifecycle state (PRD A-07)
 * Valid transitions:
 * DRIVER_ASSIGNED -> DRIVER_ARRIVED -> IN_TRANSIT -> COMPLETED
 * Any active state -> CANCELLED (requires cancelReason)
 * @param {number|string} tripId
 * @param {string} nextStatus
 * @param {Object} [metadata]
 * @returns {Promise<Object>}
 */
export async function updateTripStatus(tripId, nextStatus, metadata = {}) {
  const numericTripId = Number(tripId);

  const allowedStatuses = [
    'DRIVER_ASSIGNED',
    'DRIVER_ARRIVED',
    'IN_TRANSIT',
    'COMPLETED',
    'CANCELLED'
  ];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error(`Invalid target trip status: ${nextStatus}`);
  }

  // Strict cancellation reason sanitization and boundary check
  let sanitizedCancelReason = null;
  if (nextStatus === 'CANCELLED') {
    if (
      !metadata.cancelReason ||
      typeof metadata.cancelReason !== 'string' ||
      !metadata.cancelReason.trim()
    ) {
      throw new Error('A cancellation reason is required to cancel this trip.');
    }
    sanitizedCancelReason = metadata.cancelReason.replace(/[<>]/g, '').trim();
    if (!sanitizedCancelReason) {
      throw new Error('A cancellation reason is required to cancel this trip.');
    }
    if (sanitizedCancelReason.length > 500) {
      throw new Error('Cancellation reason cannot exceed 500 characters.');
    }
  }

  try {
    const payload = {
      status: nextStatus,
      ...(sanitizedCancelReason ? { cancelReason: sanitizedCancelReason } : {})
    };
    const res = await fetch(`/api/v1/admin/trips/${numericTripId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(200);

  const tripIdx = _trips.findIndex((t) => t.tripId === numericTripId);
  if (tripIdx === -1) throw new Error('Trip not found.');

  const trip = _trips[tripIdx];

  // Terminal state immutability
  if (trip.tripStatus === 'COMPLETED' || trip.tripStatus === 'CANCELLED') {
    throw new Error(`Trip #TRP-${numericTripId} is already settled (${trip.tripStatus}) and cannot be updated.`);
  }

  // State Machine Transition Matrix Enforcement (CWE-840 mitigation)
  const VALID_TRANSITIONS = {
    UNASSIGNED: ['CANCELLED'],
    ASSIGNMENT_PENDING: ['CANCELLED'],
    DRIVER_ASSIGNED: ['DRIVER_ARRIVED', 'CANCELLED'],
    DRIVER_ARRIVED: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };

  const allowedNext = VALID_TRANSITIONS[trip.tripStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition: Cannot move trip from "${trip.tripStatus}" to "${nextStatus}".`
    );
  }

  // Anti-mass-assignment: strictly construct updated object without merging arbitrary metadata
  const updated = {
    ...trip,
    tripStatus: nextStatus
  };

  if (nextStatus === 'IN_TRANSIT') {
    updated.startedAt = new Date().toISOString();
  } else if (nextStatus === 'COMPLETED') {
    updated.closedAt = new Date().toISOString();
    updated.expensesConfirmed = true;
  } else if (nextStatus === 'CANCELLED') {
    updated.cancelReason = sanitizedCancelReason;
    updated.closedAt = new Date().toISOString();
  }

  _trips[tripIdx] = updated;
  return updated;
}
