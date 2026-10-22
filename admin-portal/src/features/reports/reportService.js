/**
 * reportService.js
 * Service layer for Trip Reports & Fleet Performance Analytics (PRD A-08, A-11).
 * Supports financial reconciliation, multi-preset date filtering, visual aggregations,
 * and sanitized CSV export with CWE-1236 formula injection defense.
 */

// ---------------------------------------------------------------------------
// Historical Seed Dataset — Comprehensive Real-World Fleet Performance Ledger
// ---------------------------------------------------------------------------
let _historicalTrips = [
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
    amount: 1850.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    driverEarning: 1480.00,
    platformCommission: 370.00,
    tripStatus: 'COMPLETED',
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
    amount: 2200.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    driverEarning: 1760.00,
    platformCommission: 440.00,
    tripStatus: 'COMPLETED',
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
    amount: 1150.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    driverEarning: 977.50,
    platformCommission: 172.50,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-21T07:30:00Z'
  },
  {
    tripId: 2004,
    orderId: 1001,
    companyId: 3,
    companyName: 'CloudScale Systems India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Rohan Deshmukh',
    passengerPhone: '+91 98450 11223',
    pickupSpot: 'Whitefield ITPL Main Gate, Bengaluru',
    dropoffSpot: 'Kempegowda International Airport Terminal 2',
    pickupTime: '2026-10-21T11:00:00Z',
    vehicleType: 'Sedan',
    amount: 1450.00,
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    driverEarning: 1160.00,
    platformCommission: 290.00,
    tripStatus: 'IN_TRANSIT',
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
    amount: 950.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    driverEarning: 760.00,
    platformCommission: 190.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-20T18:00:00Z'
  },
  // ── Historical Record for Last 7 Days ──
  {
    tripId: 1995,
    orderId: 980,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Deepak Rao',
    passengerPhone: '+91 98450 44556',
    pickupSpot: 'Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'Electronic City Toll Plaza, Bengaluru',
    pickupTime: '2026-10-19T10:30:00Z',
    vehicleType: 'Sedan',
    amount: 1300.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    driverEarning: 1040.00,
    platformCommission: 260.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-19T08:00:00Z'
  },
  {
    tripId: 1996,
    orderId: 981,
    companyId: 5,
    companyName: 'Vertex Mobility Tech',
    hiredSplit: 18.00,
    driverSplit: 82.00,
    passengerName: 'Ananya Sharma',
    passengerPhone: '+91 98111 88990',
    pickupSpot: 'Indiranagar 12th Main, Bengaluru',
    dropoffSpot: 'Kempegowda International Airport Terminal 1',
    pickupTime: '2026-10-18T05:45:00Z',
    vehicleType: 'Hatchback',
    amount: 1100.00,
    driverId: 104,
    driverName: 'Suresh Babu',
    driverPhone: '+91 98223 45678',
    vehicleNumber: 'KA-05-GH-3456',
    driverEarning: 902.00,
    platformCommission: 198.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-17T20:00:00Z'
  },
  {
    tripId: 1997,
    orderId: 982,
    companyId: 3,
    companyName: 'CloudScale Systems India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Priya Iyer',
    passengerPhone: '+91 98777 66554',
    pickupSpot: 'Whitefield ITPL Gate 2, Bengaluru',
    dropoffSpot: 'Koramangala Sony World Signal, Bengaluru',
    pickupTime: '2026-10-17T17:00:00Z',
    vehicleType: 'SUV',
    amount: 1650.00,
    driverId: 105,
    driverName: 'Venkatesh Prasad',
    driverPhone: '+91 98334 56789',
    vehicleNumber: 'KA-51-JK-7890',
    driverEarning: 1320.00,
    platformCommission: 330.00,
    tripStatus: 'CANCELLED',
    cancelReason: 'Flight delayed by 4 hours; passenger rescheduled meeting.',
    createdAt: '2026-10-17T12:00:00Z'
  },
  {
    tripId: 1998,
    orderId: 983,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    hiredSplit: 15.00,
    driverSplit: 85.00,
    passengerName: 'Naveen Nair',
    passengerPhone: '+91 98666 55443',
    pickupSpot: 'HSR Layout BDA Complex, Bengaluru',
    dropoffSpot: 'Outer Ring Road, Marathahalli Bridge',
    pickupTime: '2026-10-16T09:15:00Z',
    vehicleType: 'Sedan',
    amount: 850.00,
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    driverEarning: 722.50,
    platformCommission: 127.50,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-16T06:30:00Z'
  },
  // ── Historical Record for Earlier in October (Last 30 Days) ──
  {
    tripId: 1980,
    orderId: 960,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Arjun Mehta',
    passengerPhone: '+91 98451 99887',
    pickupSpot: 'Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'MG Road Metro Station, Bengaluru',
    pickupTime: '2026-10-10T08:30:00Z',
    vehicleType: 'Sedan',
    amount: 1400.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    driverEarning: 1120.00,
    platformCommission: 280.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-10T05:00:00Z'
  },
  {
    tripId: 1981,
    orderId: 961,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Sanjay Dutt',
    passengerPhone: '+91 98112 00112',
    pickupSpot: 'Yeshwanthpur Industrial Area, Bengaluru',
    dropoffSpot: 'Electronic City Toll Plaza, Bengaluru',
    pickupTime: '2026-10-08T12:00:00Z',
    vehicleType: 'SUV',
    amount: 2500.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    driverEarning: 2000.00,
    platformCommission: 500.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-08T09:30:00Z'
  },
  {
    tripId: 1982,
    orderId: 962,
    companyId: 5,
    companyName: 'Vertex Mobility Tech',
    hiredSplit: 18.00,
    driverSplit: 82.00,
    passengerName: 'Nandini Das',
    passengerPhone: '+91 98334 11223',
    pickupSpot: 'Indiranagar 100ft Road, Bengaluru',
    dropoffSpot: 'Bellandur EcoSpace Gate 2',
    pickupTime: '2026-10-05T14:45:00Z',
    vehicleType: 'Hatchback',
    amount: 750.00,
    driverId: 104,
    driverName: 'Suresh Babu',
    driverPhone: '+91 98223 45678',
    vehicleNumber: 'KA-05-GH-3456',
    driverEarning: 615.00,
    platformCommission: 135.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-05T11:00:00Z'
  }
];

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
 * Helper to compute date range window based on selected preset
 * @param {string} preset - 'today' | 'last7days' | 'last30days' | 'thismonth' | 'custom'
 * @param {string} [customStart]
 * @param {string} [customEnd]
 * @returns {{ start: Date, end: Date }}
 */
function getDateBoundary(preset, customStart, customEnd) {
  // Use fixed base date matching current simulated date (2026-10-21)
  const now = new Date('2026-10-21T23:59:59.999Z');
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
    start = new Date('2026-10-21T00:00:00.000Z');
    end = new Date('2026-10-21T23:59:59.999Z');
  } else if (preset === 'last7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
  } else if (preset === 'thismonth') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else if (preset === 'custom' && customStart && customEnd) {
    start = new Date(`${customStart}T00:00:00.000Z`);
    end = new Date(`${customEnd}T23:59:59.999Z`);
  } else {
    // Default: 'last30days'
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Fetch aggregated trip reports and ledger records matching filters (PRD A-08)
 * @param {Object} options
 * @param {string} [options.preset] - 'today' | 'last7days' | 'last30days' | 'thismonth' | 'custom'
 * @param {string} [options.startDate] - YYYY-MM-DD
 * @param {string} [options.endDate] - YYYY-MM-DD
 * @param {string} [options.companyId] - 'ALL' | number | string
 * @param {string} [options.vehicleType] - 'ALL' | 'Sedan' | 'SUV' | 'Hatchback'
 * @param {string} [options.status] - 'ALL' | 'COMPLETED' | 'CANCELLED' | 'IN_TRANSIT'
 * @param {string} [options.search] - query string
 * @returns {Promise<Object>}
 */
export async function getTripReports({
  preset = 'last30days',
  startDate = '',
  endDate = '',
  companyId = 'ALL',
  vehicleType = 'ALL',
  status = 'ALL',
  search = ''
} = {}) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('preset', preset);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (companyId !== 'ALL') queryParams.append('companyId', String(companyId));
    if (vehicleType !== 'ALL') queryParams.append('vehicleType', vehicleType);
    if (status !== 'ALL') queryParams.append('status', status);
    if (search.trim()) queryParams.append('search', search.trim());

    const res = await fetch(`/api/v1/admin/reports/trips?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch {
    // fallback
  }

  await delay(200);

  // 1. Filter by Date Boundary
  const { start, end } = getDateBoundary(preset, startDate, endDate);

  let filtered = _historicalTrips.filter((trip) => {
    const tripDate = new Date(trip.pickupTime);
    return tripDate >= start && tripDate <= end;
  });

  // 2. Filter by Corporate Client Company
  if (companyId !== 'ALL') {
    filtered = filtered.filter((t) => String(t.companyId) === String(companyId));
  }

  // 3. Filter by Vehicle Class
  if (vehicleType !== 'ALL') {
    filtered = filtered.filter(
      (t) => t.vehicleType.toLowerCase() === vehicleType.toLowerCase()
    );
  }

  // 4. Filter by Trip Status
  if (status !== 'ALL') {
    filtered = filtered.filter((t) => t.tripStatus === status);
  }

  // 5. Filter by Multi-Attribute Search
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

  // ── Compute Executive KPI Metrics (PRD A-08, A-11) ───────────────────────
  const totalTrips = filtered.length;
  const completedTripsList = filtered.filter((t) => t.tripStatus === 'COMPLETED');
  const cancelledTripsList = filtered.filter((t) => t.tripStatus === 'CANCELLED');
  const inTransitTripsList = filtered.filter((t) => t.tripStatus === 'IN_TRANSIT');

  const completedCount = completedTripsList.length;
  const cancelledCount = cancelledTripsList.length;
  const inTransitCount = inTransitTripsList.length;

  // Strict two-decimal arithmetic precision
  const grossRevenue = completedTripsList.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const driverPayouts = completedTripsList.reduce((acc, t) => acc + Number(t.driverEarning || 0), 0);
  const platformMargin = completedTripsList.reduce((acc, t) => acc + Number(t.platformCommission || 0), 0);

  const roundedGross = Number(grossRevenue.toFixed(2));
  const roundedDriverPayouts = Number(driverPayouts.toFixed(2));
  const roundedPlatformMargin = Number(platformMargin.toFixed(2));

  const settledCount = completedCount + cancelledCount;
  const completionRate =
    settledCount > 0 ? Number(((completedCount / settledCount) * 100).toFixed(1)) : 100.0;
  const avgTripFare =
    completedCount > 0 ? Number((roundedGross / completedCount).toFixed(2)) : 0.0;

  // ── Compute Daily Volume & Velocity Series ──────────────────────────────
  const dailyMap = {};
  filtered.forEach((t) => {
    const dStr = t.pickupTime.split('T')[0];
    if (!dailyMap[dStr]) {
      dailyMap[dStr] = { date: dStr, count: 0, revenue: 0 };
    }
    dailyMap[dStr].count += 1;
    if (t.tripStatus === 'COMPLETED') {
      dailyMap[dStr].revenue += Number(t.amount || 0);
    }
  });

  const dailyVolume = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── Compute Corporate Client Spend Distribution ─────────────────────────
  const companyMap = {};
  filtered.forEach((t) => {
    const cName = t.companyName;
    if (!companyMap[cName]) {
      companyMap[cName] = { companyName: cName, count: 0, spend: 0 };
    }
    companyMap[cName].count += 1;
    if (t.tripStatus === 'COMPLETED') {
      companyMap[cName].spend += Number(t.amount || 0);
    }
  });

  const corporateSpend = Object.values(companyMap)
    .map((c) => ({
      ...c,
      spend: Number(c.spend.toFixed(2)),
      percentage: roundedGross > 0 ? Number(((c.spend / roundedGross) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.spend - a.spend);

  // ── Compute Vehicle Class Demand Distribution ───────────────────────────
  const vehicleMap = { Sedan: 0, SUV: 0, Hatchback: 0 };
  filtered.forEach((t) => {
    if (vehicleMap[t.vehicleType] !== undefined) {
      vehicleMap[t.vehicleType] += 1;
    } else {
      vehicleMap[t.vehicleType] = 1;
    }
  });

  const vehicleDemand = Object.entries(vehicleMap).map(([type, count]) => ({
    type,
    count,
    percentage: totalTrips > 0 ? Number(((count / totalTrips) * 100).toFixed(1)) : 0
  }));

  // Sort trips descending by pickup time / trip ID
  const sortedTrips = [...filtered].sort(
    (a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime()
  );

  return {
    metrics: {
      totalTrips,
      completedTrips: completedCount,
      cancelledTrips: cancelledCount,
      inTransitTrips: inTransitCount,
      grossRevenue: roundedGross,
      driverPayouts: roundedDriverPayouts,
      platformMargin: roundedPlatformMargin,
      completionRate,
      avgTripFare
    },
    dailyVolume,
    corporateSpend,
    vehicleDemand,
    trips: sortedTrips
  };
}

/**
 * Sanitizes CSV cell string to defend against CSV Formula Injection (CWE-1236).
 * Prepends a single quote if string begins with `=`, `+`, `-`, or `@`.
 * Escapes internal quotes and encloses in quotation marks.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  // CWE-1236 Defense: Neutralize executable formula characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate and trigger download of sanitized CSV report (PRD A-08)
 * @param {Array<Object>} trips
 * @param {string} [filenamePrefix]
 * @returns {boolean}
 */
export function exportTripsToCsv(trips, filenamePrefix = 'hired-trips-report') {
  if (!Array.isArray(trips) || trips.length === 0) {
    throw new Error('No trip records available to export for the selected filter.');
  }

  const headers = [
    'Trip ID',
    'Order ID',
    'Pickup Date',
    'Pickup Time',
    'Corporate Client',
    'Passenger Name',
    'Passenger Contact',
    'Driver Name',
    'Driver Contact',
    'Vehicle Number',
    'Vehicle Class',
    'Pickup Location',
    'Dropoff Destination',
    'Gross Fare (INR)',
    'Driver Payout (INR)',
    'Platform Commission (INR)',
    'Trip Status'
  ];

  const rows = trips.map((t) => {
    const pickupDateObj = new Date(t.pickupTime);
    const dateFormatted = pickupDateObj.toISOString().split('T')[0];
    const timeFormatted = pickupDateObj.toTimeString().split(' ')[0].slice(0, 5);

    return [
      `TRP-${t.tripId}`,
      `ORD-${t.orderId}`,
      dateFormatted,
      timeFormatted,
      t.companyName,
      t.passengerName,
      t.passengerPhone,
      t.driverName || 'Unassigned',
      t.driverPhone || '—',
      t.vehicleNumber || '—',
      t.vehicleType,
      t.pickupSpot,
      t.dropoffSpot,
      Number(t.amount).toFixed(2),
      Number(t.driverEarning || 0).toFixed(2),
      Number(t.platformCommission || 0).toFixed(2),
      t.tripStatus
    ];
  });

  const csvContent = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map((row) => row.map(sanitizeCsvCell).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${dateStr}.csv`;

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  return false;
}
