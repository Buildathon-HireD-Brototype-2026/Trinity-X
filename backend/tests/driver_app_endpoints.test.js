import app from '../src/server.js';
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/shared/security.js';

let server;
let baseUrl;

const testPhone1 = '+919100000001';
const testPhone2 = '+919100000002';
const testPassword = 'TestDriver@123';
const testCompanyEmail = 'testdriverlogistics@example.com';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  let headers = { ...(options.headers || {}) };
  let body;

  if (options.formData) {
    body = options.formData;
  } else if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('=================================================================');
  console.log('   HIRED DRIVER APP INTEGRATION ENDPOINT TEST SUITE              ');
  console.log('=================================================================\n');

  // Setup self-contained test fixtures
  const testPasswordHash = await hashPassword(testPassword);
  let office = await prisma.office.findFirst();
  if (!office) {
    office = await prisma.office.create({
      data: {
        officeName: 'Trinity X HQ Kochi',
        officeLocation: 'Infopark, Kakkanad, Kochi, Kerala'
      }
    });
  }

  let testCompany = await prisma.company.findFirst({ where: { emailId: testCompanyEmail } });
  if (!testCompany) {
    testCompany = await prisma.company.create({
      data: {
        name: 'Test Driver Logistics',
        emailId: testCompanyEmail,
        phoneNo: '+919100000000',
        contactPerson: 'Test Manager',
        officeId: office.officeId,
        passwordHash: testPasswordHash,
        status: 'ACTIVE',
        hiredSplit: 70.00,
        driverSplit: 30.00
      }
    });
  }

  let testDriver1 = await prisma.driver.findFirst({ where: { phoneNo: testPhone1 } });
  if (!testDriver1) {
    testDriver1 = await prisma.driver.create({
      data: {
        name: 'Test Driver Alpha',
        phoneNo: testPhone1,
        passwordHash: testPasswordHash,
        status: 'ACTIVE',
        isOnline: true,
        currentLocation: 'Infopark, Kakkanad, Kochi'
      }
    });
  } else {
    await prisma.driver.update({
      where: { driverId: testDriver1.driverId },
      data: { status: 'ACTIVE', passwordHash: testPasswordHash, isOnline: true }
    });
  }

  let testDriver2 = await prisma.driver.findFirst({ where: { phoneNo: testPhone2 } });
  if (!testDriver2) {
    testDriver2 = await prisma.driver.create({
      data: {
        name: 'Test Driver Beta',
        phoneNo: testPhone2,
        passwordHash: testPasswordHash,
        status: 'ACTIVE',
        isOnline: false,
        currentLocation: 'Edapally, Kochi'
      }
    });
  } else {
    await prisma.driver.update({
      where: { driverId: testDriver2.driverId },
      data: { status: 'ACTIVE', passwordHash: testPasswordHash, isOnline: false }
    });
  }

  // Clear previous test records for clean slate
  await prisma.tripPayroll.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.driverWalletTransaction.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.expense.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.driverDocument.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.driverLeave.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.driverLocation.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.driverLocationHistory.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.tripSosAlert.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.trip.deleteMany({ where: { driverId: testDriver1.driverId } });
  await prisma.order.deleteMany({ where: { companyId: testCompany.companyId } });

  const admin = await prisma.admin.findFirst();

  const testOrder = await prisma.order.create({
    data: {
      companyId: testCompany.companyId,
      pickupSpot: 'Infopark Phase 1, Kakkanad, Kochi',
      dropoffSpot: 'Cochin International Airport (COK), Nedumbassery',
      pickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      contactName: 'Deepak Nambiar',
      contactPhone: '+919800000001',
      status: 'ACCEPTED',
      source: 'PORTAL',
      decidedByAdminId: admin ? admin.adminId : undefined,
      decidedAt: new Date()
    }
  });

  const testTrip = await prisma.trip.create({
    data: {
      orderId: testOrder.orderId,
      driverId: testDriver1.driverId,
      amount: 2500.00,
      otp: '482910',
      otpAttempts: 0,
      expensesConfirmed: false,
      tripStatus: 'ASSIGNED',
      assignedAt: new Date(),
      eta: new Date(Date.now() + 45 * 60 * 1000)
    }
  });


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
  let seededTripId = testTrip.tripId;
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
    // TEST 2: Driver 1 Login (All Phone Formats: +91, 91, 10-digit, spaces, dashes)
    // -------------------------------------------------------------
    console.log('TEST 2: Driver 1 login with known password (+91 format)');
    const d1LoginRes = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: testPhone1, password: testPassword }
    });
    assert(d1LoginRes.status === 200, `Driver 1 login failed with status ${d1LoginRes.status}: ${JSON.stringify(d1LoginRes.data)}`);
    assert(d1LoginRes.data.success, 'Login response must indicate success');
    driver1Token = d1LoginRes.data.data.access_token;
    assert(driver1Token, 'Access token must be returned');
    console.log('  PASS - Driver 1 authenticated with +91 format.');

    // Subtest 2a: 12-digit format without plus (91XXXXXXXXXX)
    const d1Format91 = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '919100000001', password: testPassword }
    });
    assert(d1Format91.status === 200, `Login with 91XXXXXXXXXX failed: ${d1Format91.status}`);
    console.log('  PASS - Driver 1 login with 91XXXXXXXXXX (no +).');

    // Subtest 2b: 10-digit format (XXXXXXXXXX)
    const d1Format10 = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '9100000001', password: testPassword }
    });
    assert(d1Format10.status === 200, `Login with 10-digit phone failed: ${d1Format10.status}`);
    console.log('  PASS - Driver 1 login with 10-digit phone.');

    // Subtest 2c: Phone with spaces (+91 91000 00001)
    const d1FormatSpaces = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '+91 91000 00001', password: testPassword }
    });
    assert(d1FormatSpaces.status === 200, `Login with spaces failed: ${d1FormatSpaces.status}`);
    console.log('  PASS - Driver 1 login with spaces (+91 91000 00001).');

    // Subtest 2d: Phone with dashes (+91-91000-00001)
    const d1FormatDashes = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: '+91-91000-00001', password: testPassword }
    });
    assert(d1FormatDashes.status === 200, `Login with dashes failed: ${d1FormatDashes.status}`);
    console.log('  PASS - Driver 1 login with dashes (+91-91000-00001).');

    // -------------------------------------------------------------
    // TEST 3: Driver 2 Login
    // -------------------------------------------------------------
    console.log('TEST 3: Driver 2 login with known password');
    const d2LoginRes = await request('/api/v1/auth/driver/login', {
      method: 'POST',
      body: { phone: testPhone2, password: testPassword }
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
    assert(Array.isArray(confRes.data.data.expenses), 'Response must include real expenses list');
    assert(confRes.data.data.expenses.length > 0, 'Expenses list must not be empty');
    assert(confRes.data.data.expenses.some(e => e.expense_id === testExpenseId), 'Logged expense must be present in response');
    assert(typeof confRes.data.data.version === 'number', 'Version must be a number');
    console.log(`  PASS - Expenses confirmed with ${confRes.data.data.expenses.length} expense(s), version: ${confRes.data.data.version}.`);

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

    // -------------------------------------------------------------
    // TEST 21: Upload KYC Document (Storage Adapter & 5MB Limit)
    // -------------------------------------------------------------
    console.log('TEST 21: Upload KYC document (POST /api/v1/driver/documents)');
    const pdfContent = Buffer.from('%PDF-1.4 Mock driving licence binary test stream');
    const docFormData = new FormData();
    docFormData.append('file', new Blob([pdfContent], { type: 'application/pdf' }), 'driving_licence.pdf');
    docFormData.append('document_type', 'DRIVING_LICENCE');

    const docUploadRes = await request('/api/v1/driver/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      formData: docFormData
    });
    assert(docUploadRes.status === 201, `Document upload failed: ${JSON.stringify(docUploadRes.data)}`);
    assert(docUploadRes.data.data.document_id !== undefined, 'Document ID must be returned');
    assert(docUploadRes.data.data.document_type === 'DRIVING_LICENCE', 'Document type must match');
    const uploadedDocId = docUploadRes.data.data.document_id;
    console.log(`  PASS - Document uploaded successfully (ID: ${uploadedDocId}).`);

    // -------------------------------------------------------------
    // TEST 22: Generate Signed Document Link & Download Real Content
    // -------------------------------------------------------------
    console.log('TEST 22: Generate signed link and download document (GET /api/v1/driver/documents/:id/link)');
    const linkRes = await request(`/api/v1/driver/documents/${uploadedDocId}/link`, {
      headers: { Authorization: `Bearer ${driver1Token}` }
    });
    assert(linkRes.status === 200, `Link generation failed: ${JSON.stringify(linkRes.data)}`);
    assert(linkRes.data.data.url, 'Signed URL must be returned');

    // Fetch file via signed URL
    const fileRes = await fetch(linkRes.data.data.url);
    assert(fileRes.status === 200, `Signed download failed with status ${fileRes.status}`);
    const downloadedBuf = Buffer.from(await fileRes.arrayBuffer());
    assert(downloadedBuf.toString() === pdfContent.toString(), 'Downloaded content must match uploaded file');
    console.log('  PASS - Signed document link verified and real file content downloaded.');

    // -------------------------------------------------------------
    // TEST 23: Upload Profile Photo & Verify Persistence
    // -------------------------------------------------------------
    console.log('TEST 23: Upload profile photo (POST /api/v1/driver/profile/photo)');
    const photoContent = Buffer.from('mock_png_image_binary_data');
    const photoFormData = new FormData();
    photoFormData.append('photo', new Blob([photoContent], { type: 'image/png' }), 'driver_avatar.png');

    const photoRes = await request('/api/v1/driver/profile/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      formData: photoFormData
    });
    assert(photoRes.status === 200, `Photo upload failed: ${JSON.stringify(photoRes.data)}`);
    assert(photoRes.data.data.has_photo === true, 'has_photo must be true');
    console.log('  PASS - Profile photo uploaded and persisted.');

    // -------------------------------------------------------------
    // TEST 24: Upload File Validation Guards (Size & Mime Type)
    // -------------------------------------------------------------
    console.log('TEST 24: File validation guards (5 MB limit and unsupported type rejection)');
    const invalidTypeForm = new FormData();
    invalidTypeForm.append('file', new Blob([Buffer.from('plain text')], { type: 'text/plain' }), 'notes.txt');
    invalidTypeForm.append('document_type', 'AADHAAR');

    const invalidTypeRes = await request('/api/v1/driver/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      formData: invalidTypeForm
    });
    assert(invalidTypeRes.status === 422, 'Unsupported file type must be rejected with 422');

    // Test > 5MB file
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
    const oversizedForm = new FormData();
    oversizedForm.append('file', new Blob([oversizedBuffer], { type: 'image/png' }), 'huge_image.png');
    oversizedForm.append('document_type', 'AADHAAR');

    const oversizedRes = await request('/api/v1/driver/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver1Token}` },
      formData: oversizedForm
    });
    assert(oversizedRes.status === 422, 'Oversized file (>5MB) must be rejected with 422');
    console.log('  PASS - File validation guards correctly reject invalid types and oversized files.');

    console.log('\n=================================================================');
    console.log('   ALL 24 DRIVER APP INTEGRATION ENDPOINT TESTS PASSED (100%)   ');
    console.log('=================================================================\n');

  } finally {
    if (server) {
      server.close();
    }
    try {
      await prisma.tripPayroll.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driverWalletTransaction.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.expense.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driverDocument.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driverLeave.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driverLocation.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driverLocationHistory.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.tripSosAlert.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.trip.deleteMany({ where: { driver: { phoneNo: { in: [testPhone1, testPhone2] } } } });
      await prisma.driver.deleteMany({ where: { phoneNo: { in: [testPhone1, testPhone2] } } });
      await prisma.order.deleteMany({ where: { company: { emailId: testCompanyEmail } } });
      await prisma.company.deleteMany({ where: { emailId: testCompanyEmail } });
    } catch (_) {}
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

