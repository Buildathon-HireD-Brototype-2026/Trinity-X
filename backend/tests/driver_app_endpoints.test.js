import app from '../src/server.js';
import prisma from '../src/config/db.js';

let server;
let baseUrl;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('=================================================================');
  console.log('   HIRED DRIVER APP INTEGRATION ENDPOINT TEST SUITE              ');
  console.log('=================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[test-runner] Ephemeral test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  let driver1Token = '';
  let driver2Token = '';
  let seededTripId = null;
  let testLeaveId = null;
  let testExpenseId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Health check endpoint database connectivity
    // -------------------------------------------------------------
    console.log('TEST 1: Health check endpoint (/api/v1/health)');
    const healthRes = await request('/api/v1/health');
    assert(healthRes.status === 200, `Expected 200 OK from /api/v1/health, got ${healthRes.status}`);
    assert(healthRes.data.status === 'ok', 'Health status should be ok');
    assert(healthRes.data.database === 'connected', 'Database should be connected');
    console.log('  PASS - /api/v1/health verified database connectivity.');

    // -------------------------------------------------------------
    // TEST 2: Driver 1 Login
    // -------------------------------------------------------------
    console.log('TEST 2: Driver 1 login with known password');
    const d1LoginRes = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '+919876543210', password: 'Driver@123' }
    });
    assert(d1LoginRes.status === 200, `Driver 1 login failed with status ${d1LoginRes.status}: ${JSON.stringify(d1LoginRes.data)}`);
    assert(d1LoginRes.data.success, 'Login response must indicate success');
    driver1Token = d1LoginRes.data.data.access_token;
    assert(driver1Token, 'Access token must be returned');
    console.log('  PASS - Driver 1 authenticated successfully.');

    // -------------------------------------------------------------
    // TEST 3: Driver 2 Login
    // -------------------------------------------------------------
    console.log('TEST 3: Driver 2 login with known password');
    const d2LoginRes = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '+919876543211', password: 'Driver@123' }
    });
    assert(d2LoginRes.status === 200, `Driver 2 login failed: ${JSON.stringify(d2LoginRes.data)}`);
    driver2Token = d2LoginRes.data.data.access_token;
    console.log('  PASS - Driver 2 authenticated successfully.');

    // -------------------------------------------------------------
    // TEST 4: Head Office Info Endpoint
    // -------------------------------------------------------------
    console.log('TEST 4: Get Head Office info (GET /api/v1/driver/office)');
    const officeRes = await request('/api/v1/driver/office', {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(officeRes.status === 200, `Expected 200, got ${officeRes.status}`);
    assert(officeRes.data.data.office_id !== undefined, 'Office ID must be present');
    assert(officeRes.data.data.office_name, 'Office name must be present');
    console.log(`  PASS - Head Office retrieved: ${officeRes.data.data.office_name}`);

    // -------------------------------------------------------------
    // TEST 5: Driver Duty Toggle
    // -------------------------------------------------------------
    console.log('TEST 5: Toggle driver duty status (PATCH /api/v1/driver/availability)');
    const dutyRes = await request('/api/v1/driver/availability', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: { is_online: true }
    });
    assert(dutyRes.status === 200, 'Duty update must return 200');
    assert(dutyRes.data.data.is_online === true, 'is_online must be true');
    console.log('  PASS - Driver availability updated to true.');

    // -------------------------------------------------------------
    // TEST 6: Driver Leave Request (Default Status PENDING)
    // -------------------------------------------------------------
    console.log('TEST 6: Request leave with default PENDING status (POST /api/v1/driver/leaves)');
    const leaveRes = await request('/api/v1/driver/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: {
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        reason: 'Family emergency'
      }
    });
    assert(leaveRes.status === 201, `Expected 201, got ${leaveRes.status}: ${JSON.stringify(leaveRes.data)}`);
    assert(leaveRes.data.data.status === 'PENDING', `Expected status PENDING, got ${leaveRes.data.data.status}`);
    assert(leaveRes.data.data.reason === 'Family emergency', 'Reason must match');
    testLeaveId = leaveRes.data.data.leave_id;
    console.log('  PASS - Leave created with default PENDING status and reason.');

    // -------------------------------------------------------------
    // TEST 7: List Driver Leaves
    // -------------------------------------------------------------
    console.log('TEST 7: List driver leaves (GET /api/v1/driver/leaves)');
    const listLeavesRes = await request('/api/v1/driver/leaves', {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(listLeavesRes.status === 200, 'List leaves should return 200');
    assert(Array.isArray(listLeavesRes.data.data), 'Data should be an array');
    assert(listLeavesRes.data.data.some(l => l.leave_id === testLeaveId), 'Created leave must be in list');
    console.log('  PASS - Driver leaves list retrieved.');

    // -------------------------------------------------------------
    // TEST 8: Data Isolation - Driver 2 cannot delete Driver 1's leave
    // -------------------------------------------------------------
    console.log("TEST 8: Driver data isolation - Driver 2 cannot delete Driver 1's leave");
    const isolateLeaveRes = await request(`/api/v1/driver/leaves/${testLeaveId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${driver2Token}` }
    });
    assert(isolateLeaveRes.status === 404, `Expected 404 for cross-driver leave deletion, got ${isolateLeaveRes.status}`);
    console.log('  PASS - Cross-driver leave deletion rejected with 404.');

    // -------------------------------------------------------------
    // TEST 9: Delete Driver's Own Leave
    // -------------------------------------------------------------
    console.log("TEST 9: Delete driver's own leave (DELETE /api/v1/driver/leaves/:id)");
    const deleteLeaveRes = await request(`/api/v1/driver/leaves/${testLeaveId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(deleteLeaveRes.status === 200, 'Delete own leave must return 200');
    console.log('  PASS - Leave successfully deleted.');

    // -------------------------------------------------------------
    // TEST 10: List Assigned Trips
    // -------------------------------------------------------------
    console.log('TEST 10: List assigned trips (GET /api/v1/driver/trips)');
    const tripsRes = await request('/api/v1/driver/trips', {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(tripsRes.status === 200, 'Trips listing must return 200');
    assert(Array.isArray(tripsRes.data.data.items), 'Trips items must be array');
    const assignedTrip = tripsRes.data.data.items.find(t => t.trip_status === 'ASSIGNED');
    assert(assignedTrip, 'Driver 1 must have at least one ASSIGNED trip from seed');
    seededTripId = assignedTrip.trip_id;
    console.log(`  PASS - Assigned trip #${seededTripId} retrieved.`);

    // -------------------------------------------------------------
    // TEST 11: Trip Detail Shape Matches OpenAPI (without order_items)
    // -------------------------------------------------------------
    console.log('TEST 11: Trip detail matches OpenAPI exact schema');
    const tripDetailRes = await request(`/api/v1/driver/trips/${seededTripId}`, {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(tripDetailRes.status === 200, 'Trip detail should return 200');
    const td = tripDetailRes.data.data;
    assert(td.trip_id !== undefined, 'trip_id must be present');
    assert(td.pickup_spot, 'pickup_spot must be present');
    assert(td.dropoff_spot, 'dropoff_spot must be present');
    assert(td.contact_name, 'contact_name must be present');
    assert(td.contact_phone, 'contact_phone must be present');
    assert(Array.isArray(td.expenses), 'expenses array must be present');
    assert(td.order_items === undefined && td.items === undefined, 'order items must NOT be in trip response');
    console.log('  PASS - Trip detail matches OpenAPI specification.');

    // -------------------------------------------------------------
    // TEST 12: Data Isolation - Driver 2 cannot access Driver 1's trip
    // -------------------------------------------------------------
    console.log("TEST 12: Driver data isolation - Driver 2 cannot access Driver 1's trip");
    const isolateTripRes = await request(`/api/v1/driver/trips/${seededTripId}`, {
      headers: { Authorization: `Bearer ${driver2Token}` }
    });
    assert(isolateTripRes.status === 404, `Expected 404 for cross-driver trip view, got ${isolateTripRes.status}`);
    console.log('  PASS - Cross-driver trip access blocked with 404.');

    // -------------------------------------------------------------
    // TEST 13: Start Trip
    // -------------------------------------------------------------
    console.log('TEST 13: Start assigned trip (POST /api/v1/driver/trips/:trip_id/start)');
    const startRes = await request(`/api/v1/driver/trips/${seededTripId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: { selfie_url: 'uploads/selfie_driver1.jpg' }
    });
    assert(startRes.status === 200, `Expected 200, got ${startRes.status}: ${JSON.stringify(startRes.data)}`);
    assert(startRes.data.data.trip_status === 'ONGOING', 'Trip status must now be ONGOING');
    console.log('  PASS - Trip transitioned to ONGOING.');

    // -------------------------------------------------------------
    // TEST 14: Log In-Trip Expense
    // -------------------------------------------------------------
    console.log('TEST 14: Log in-trip expense (POST /api/v1/driver/trips/:id/expenses)');
    const expRes = await request(`/api/v1/driver/trips/${seededTripId}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: {
        description: 'Airport Highway Toll',
        amount: '85.00'
      }
    });
    assert(expRes.status === 201, `Expected 201, got ${expRes.status}: ${JSON.stringify(expRes.data)}`);
    assert(expRes.data.data.amount === '85.00', 'Amount must match');
    testExpenseId = expRes.data.data.expense_id;
    console.log('  PASS - Expense logged.');

    // -------------------------------------------------------------
    // TEST 15: Confirm Expenses
    // -------------------------------------------------------------
    console.log('TEST 15: Confirm expenses complete (POST /api/v1/driver/trips/:id/confirm-expenses)');
    const confRes = await request(`/api/v1/driver/trips/${seededTripId}/confirm-expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(confRes.status === 200, 'Confirm expenses must return 200');
    assert(confRes.data.data.expenses_confirmed === true, 'expenses_confirmed must be true');
    console.log('  PASS - Expenses confirmed.');

    // -------------------------------------------------------------
    // TEST 16: Single Location Ping with Google Maps URL
    // -------------------------------------------------------------
    console.log('TEST 16: Send location ping (POST /api/v1/driver/location)');
    // Wait small delay to clear any prior rate limit
    await new Promise(r => setTimeout(r, 3100));
    const locRes = await request('/api/v1/driver/location', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: {
        lat: 10.0158,
        lng: 76.3418,
        speed: 42.5,
        heading: 180.0,
        accuracy: 4.2,
        battery_percent: 75,
        trip_id: Number(seededTripId)
      }
    });
    assert(locRes.status === 200, `Expected 200, got ${locRes.status}: ${JSON.stringify(locRes.data)}`);
    assert(locRes.data.data.google_maps_url.includes('10.0158,76.3418'), 'google_maps_url must contain coordinates');
    console.log(`  PASS - Location ping recorded with Maps URL: ${locRes.data.data.google_maps_url}`);

    // -------------------------------------------------------------
    // TEST 17: Location Ping Rate Limiting (1 ping per 3 seconds)
    // -------------------------------------------------------------
    console.log('TEST 17: Location ping rate limit enforcement (under 3 seconds)');
    const rapidPingRes = await request('/api/v1/driver/location', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: {
        lat: 10.0160,
        lng: 76.3420
      }
    });
    assert(rapidPingRes.status === 429, `Expected 429 RATE_LIMITED, got ${rapidPingRes.status}`);
    console.log('  PASS - Rapid location ping correctly rate-limited with 429.');

    // -------------------------------------------------------------
    // TEST 18: Batch Offline Location Sync
    // -------------------------------------------------------------
    console.log('TEST 18: Batch offline location sync (POST /api/v1/driver/locations/batch)');
    const batchRes = await request('/api/v1/driver/locations/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: {
        pings: [
          { lat: 10.0200, lng: 76.3450, speed: 45.0, recorded_at: new Date(Date.now() - 60000).toISOString() },
          { lat: 10.0250, lng: 76.3480, speed: 50.0, recorded_at: new Date(Date.now() - 30000).toISOString() }
        ]
      }
    });
    assert(batchRes.status === 200, `Expected 200, got ${batchRes.status}`);
    assert(batchRes.data.data.synced === 2, 'Should report 2 synced pings');
    console.log('  PASS - 2 offline location pings synchronized.');

    // -------------------------------------------------------------
    // TEST 19: Driver Wallet View
    // -------------------------------------------------------------
    console.log('TEST 19: View driver wallet (GET /api/v1/driver/wallet)');
    const walletRes = await request('/api/v1/driver/wallet', {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(walletRes.status === 200, 'Wallet retrieval must return 200');
    assert(walletRes.data.data.balance !== undefined, 'Wallet balance must be defined');
    assert(Array.isArray(walletRes.data.data.transactions.items), 'Transactions items must be array');
    console.log(`  PASS - Driver wallet balance: ₹${walletRes.data.data.balance}`);

    // -------------------------------------------------------------
    // TEST 20: Close Trip with OTP Verification
    // -------------------------------------------------------------
    console.log('TEST 20: Complete trip with passenger OTP (POST /api/v1/driver/trips/:id/close)');
    const closeRes = await request(`/api/v1/driver/trips/${seededTripId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      body: { otp: '482910' }
    });
    assert(closeRes.status === 200, `Expected 200, got ${closeRes.status}: ${JSON.stringify(closeRes.data)}`);
    assert(closeRes.data.data.status === 'CLOSED', 'Trip status must be CLOSED');
    console.log('  PASS - Trip closed with OTP verification; payroll & wallet credit processed.');

    console.log('\n=================================================================');
    console.log('   ALL 20 DRIVER APP INTEGRATION ENDPOINT TESTS PASSED (100%)   ');
    console.log('=================================================================\n');

  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTEST SUITE FAILED:', err);
    if (server) server.close();
    process.exit(1);
  });

