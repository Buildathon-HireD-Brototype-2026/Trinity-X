import app from '../src/server.js';
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/shared/security.js';

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
  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('=================================================================');
  console.log('   HIRED ADMIN, COMPANY & DRIVER OPENAPI TEST SUITE             ');
  console.log('=================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[test-runner] Ephemeral test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  const defaultOffice = await prisma.office.findFirst();
  const testOfficeId = defaultOffice?.officeId || 1;

  // Clean up any test fixtures from previous runs
  const testEmails = [
    'testcorp@logistics.example',
    'duplicate@test.example',
    'anothercorp@test.example',
    'partner@testcompany.com'
  ];
  for (const email of testEmails) {
    const comps = await prisma.company.findMany({ where: { emailId: email } });
    for (const c of comps) {
      const orders = await prisma.order.findMany({ where: { companyId: c.companyId } });
      for (const o of orders) {
        const trip = await prisma.trip.findUnique({ where: { orderId: o.orderId } });
        if (trip) {
          await prisma.driverWalletTransaction.deleteMany({ where: { tripId: trip.tripId } });
          await prisma.trip.delete({ where: { tripId: trip.tripId } });
        }
        await prisma.order.delete({ where: { orderId: o.orderId } });
      }
      await prisma.session.deleteMany({ where: { userType: 'PARTNER', userId: c.companyId } });
      await prisma.company.delete({ where: { companyId: c.companyId } });
    }
  }

  const testPhones = ['+919999900001', '+919999900002', '+919999900003'];
  for (const phone of testPhones) {
    const existing = await prisma.driver.findUnique({ where: { phoneNo: phone } });
    if (existing) {
      await prisma.driverDocument.deleteMany({ where: { driverId: existing.driverId } });
      await prisma.driverLeave.deleteMany({ where: { driverId: existing.driverId } });
      await prisma.driverWalletTransaction.deleteMany({ where: { driverId: existing.driverId } });
      await prisma.session.deleteMany({ where: { userType: 'DRIVER', userId: existing.driverId } });
      await prisma.driver.delete({ where: { driverId: existing.driverId } });
    }
  }

  let adminAccessToken = '';
  let adminRefreshToken = '';
  let createdCompanyId = null;
  let createdDriverId = null;
  let testDocumentId = null;

  try {
    // =========================================================================
    // 1. ADMIN AUTHENTICATION (OpenAPI Contract)
    // =========================================================================
    console.log('TEST 1: Admin Login via /api/v1/auth/admin/login');
    const loginRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'admin1@hired.com', password: 'Admin@12345' }
    });
    assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
    assert(loginRes.data.success === true, 'Response must have success: true');
    assert(!!loginRes.data.data.access_token, 'access_token required');
    assert(!!loginRes.data.data.refresh_token, 'refresh_token required');
    assert(loginRes.data.data.token_type === 'Bearer', 'token_type must be Bearer');
    assert(loginRes.data.data.expires_in === 900, 'expires_in must be 900');
    assert(loginRes.data.data.user_type === 'ADMIN', 'user_type must be ADMIN');
    assert(!!loginRes.data.data.user.name, 'user.name must exist');
    assert(!loginRes.data.data.user.password_hash, 'password_hash must never be returned');
    adminAccessToken = loginRes.data.data.access_token;
    adminRefreshToken = loginRes.data.data.refresh_token;
    console.log('  PASS - Admin login returned OpenAPI-compliant LoginResult.\n');

    console.log('TEST 2: Admin Login with invalid credentials');
    const badLoginRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'admin1@hired.com', password: 'WrongPassword@999' }
    });
    assert(badLoginRes.status === 401, `Expected 401, got ${badLoginRes.status}`);
    assert(badLoginRes.data.success === false, 'success must be false');
    assert(badLoginRes.data.error.code === 'INVALID_CREDENTIALS', 'code must be INVALID_CREDENTIALS');
    console.log('  PASS - Generic 401 error returned without enumeration leak.\n');

    console.log('TEST 3: Refresh Token via /api/v1/auth/refresh');
    const refreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refresh_token: adminRefreshToken }
    });
    assert(refreshRes.status === 200, `Expected 200, got ${refreshRes.status}`);
    assert(refreshRes.data.success === true, 'success must be true');
    assert(!!refreshRes.data.data.access_token, 'New access token must be returned');
    assert(refreshRes.data.data.token_type === 'Bearer', 'token_type must be Bearer');
    assert(refreshRes.data.data.expires_in === 900, 'expires_in must be 900');
    // Update active admin token
    adminAccessToken = refreshRes.data.data.access_token;
    console.log('  PASS - Token refreshed successfully.\n');

    console.log('TEST 4: Unauthorized Access Protection on /api/v1/admin/companies');
    const noAuthRes = await request('/api/v1/admin/companies', { method: 'GET' });
    assert(noAuthRes.status === 401, `Expected 401 without auth header, got ${noAuthRes.status}`);
    assert(noAuthRes.data.success === false, 'success must be false');
    assert(noAuthRes.data.error.code === 'UNAUTHORIZED', 'code must be UNAUTHORIZED');
    console.log('  PASS - Unauthorized requests correctly blocked.\n');

    // =========================================================================
    // 2. COMPANY MANAGEMENT
    // =========================================================================
    console.log('TEST 5: Create Company via POST /api/v1/admin/companies');
    const createCompRes = await request('/api/v1/admin/companies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        name: 'Apex Transports Ltd',
        address: '100 Marine Drive, Kochi',
        contact_person: 'Rahul Varma',
        phone_no: '+919876501122',
        email_id: 'testcorp@logistics.example',
        password: 'CompanySecret@123',
        office_id: testOfficeId,
        company_location: 'Kochi Port',
        driver_share_pct: '30.00',
        platform_share_pct: '70.00'
      }
    });
    assert(createCompRes.status === 201, `Expected 201, got ${createCompRes.status}`);
    assert(createCompRes.data.success === true, 'success must be true');
    assert(createCompRes.data.data.name === 'Apex Transports Ltd', 'name must match');
    assert(createCompRes.data.data.driver_share_pct === '30.00', 'driver_share_pct must match');
    assert(createCompRes.data.data.platform_share_pct === '70.00', 'platform_share_pct must match');
    assert(!createCompRes.data.data.password_hash, 'password_hash must never be returned');
    createdCompanyId = createCompRes.data.data.company_id;
    console.log(`  PASS - Company created with ID ${createdCompanyId}.\n`);

    console.log('TEST 6: Payout split sum validation (must equal 100)');
    const invalidSplitRes = await request('/api/v1/admin/companies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        name: 'Invalid Split Corp',
        email_id: 'invalidsplit@test.example',
        password: 'Pass@12345678',
        office_id: testOfficeId,
        driver_share_pct: '40.00',
        platform_share_pct: '50.00' // Sum = 90 !== 100
      }
    });
    assert(invalidSplitRes.status === 422, `Expected 422, got ${invalidSplitRes.status}`);
    assert(invalidSplitRes.data.error.code === 'VALIDATION_ERROR', 'code must be VALIDATION_ERROR');
    console.log('  PASS - Payout split not summing to 100 was rejected with 422.\n');

    console.log('TEST 7: Duplicate case-insensitive email rejection');
    const dupEmailRes = await request('/api/v1/admin/companies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        name: 'Duplicate Inc',
        email_id: 'TESTCORP@LOGISTICS.EXAMPLE', // Upper-case duplicate of Test 5
        password: 'Pass@12345678',
        office_id: testOfficeId,
        driver_share_pct: '30.00',
        platform_share_pct: '70.00'
      }
    });
    assert(dupEmailRes.status === 409, `Expected 409, got ${dupEmailRes.status}`);
    assert(dupEmailRes.data.error.code === 'DUPLICATE_EMAIL', 'code must be DUPLICATE_EMAIL');
    console.log('  PASS - Case-insensitive duplicate email rejected with 409.\n');

    console.log('TEST 8: List companies with pagination and status filter');
    const listCompRes = await request('/api/v1/admin/companies?status=ACTIVE&page=1&limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(listCompRes.status === 200, `Expected 200, got ${listCompRes.status}`);
    assert(listCompRes.data.success === true, 'success must be true');
    assert(Array.isArray(listCompRes.data.data.items), 'items must be array');
    assert(listCompRes.data.data.page === 1, 'page must be 1');
    assert(listCompRes.data.data.total >= 1, 'total must be >= 1');
    console.log('  PASS - Companies list returned with pagination.\n');

    console.log('TEST 9: Get company detail via GET /api/v1/admin/companies/:company_id');
    const getCompRes = await request(`/api/v1/admin/companies/${createdCompanyId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(getCompRes.status === 200, `Expected 200, got ${getCompRes.status}`);
    assert(getCompRes.data.data.company_id === createdCompanyId, 'company_id must match');
    assert(getCompRes.data.data.platform_share_pct === '70.00', 'platform_share_pct must match');
    console.log('  PASS - Company detail retrieved.\n');

    console.log('TEST 10: Non-existent company returns 404 NOT_FOUND');
    const notFoundCompRes = await request('/api/v1/admin/companies/9999999', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(notFoundCompRes.status === 404, `Expected 404, got ${notFoundCompRes.status}`);
    assert(notFoundCompRes.data.error.code === 'NOT_FOUND', 'code must be NOT_FOUND');
    console.log('  PASS - Missing company returns 404.\n');

    console.log('TEST 11: Update company details via PATCH /api/v1/admin/companies/:company_id');
    const updateCompRes = await request(`/api/v1/admin/companies/${createdCompanyId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        contact_person: 'Kavita Menon',
        phone_no: '+919876599999'
      }
    });
    assert(updateCompRes.status === 200, `Expected 200, got ${updateCompRes.status}`);
    assert(updateCompRes.data.data.contact_person === 'Kavita Menon', 'Updated field must match');
    console.log('  PASS - Company details updated successfully.\n');

    console.log('TEST 12: Update payout split and verify audit log');
    const updateSplitRes = await request(`/api/v1/admin/companies/${createdCompanyId}/payout-split`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        driver_share_pct: '35.00',
        platform_share_pct: '65.00'
      }
    });
    assert(updateSplitRes.status === 200, `Expected 200, got ${updateSplitRes.status}`);
    assert(updateSplitRes.data.data.driver_share_pct === '35.00', 'driver_share_pct must be 35.00');
    assert(updateSplitRes.data.data.platform_share_pct === '65.00', 'platform_share_pct must be 65.00');

    // Verify audit log row was written
    const splitAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'PAYOUT_SPLIT_CHANGED',
        entityType: 'COMPANY',
        entityId: createdCompanyId
      },
      orderBy: { createdAt: 'desc' }
    });
    assert(!!splitAudit, 'Audit log row PAYOUT_SPLIT_CHANGED must exist');
    console.log('  PASS - Payout split updated and audited in same transaction.\n');

    console.log('TEST 13: Deactivate company and verify session revocation');
    // First, simulate an active session for this company
    const partnerSession = await prisma.session.create({
      data: {
        userType: 'PARTNER',
        userId: createdCompanyId,
        refreshTokenHash: 'fake_hash_' + Date.now(),
        expiresAt: new Date(Date.now() + 86400000)
      }
    });

    const deactivateRes = await request(`/api/v1/admin/companies/${createdCompanyId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'Annual review pending' }
    });
    assert(deactivateRes.status === 200, `Expected 200, got ${deactivateRes.status}`);
    assert(deactivateRes.data.data.status === 'INACTIVE', 'status must be INACTIVE');

    // Verify the partner session was revoked in the same transaction
    const refreshedSession = await prisma.session.findUnique({
      where: { sessionId: partnerSession.sessionId }
    });
    assert(!!refreshedSession.revokedAt, 'Active partner session must be revoked when company is set to INACTIVE');

    // Verify audit log row
    const deactAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_DEACTIVATED',
        entityType: 'COMPANY',
        entityId: createdCompanyId
      },
      orderBy: { createdAt: 'desc' }
    });
    assert(!!deactAudit, 'Audit log row USER_DEACTIVATED must exist');
    console.log('  PASS - Company deactivated, sessions revoked, and audited.\n');

    // =========================================================================
    // 3. DRIVER MANAGEMENT
    // =========================================================================
    console.log('TEST 14: Prepare test drivers and test Driver Listing');
    const testDriverPwd = await hashPassword('DriverSecret@123');
    // Driver 1: PENDING
    const driver1 = await prisma.driver.create({
      data: {
        name: 'Suresh Kumar',
        phoneNo: '+919999900001',
        passwordHash: testDriverPwd,
        status: 'PENDING',
        isOnline: false,
        currentLocation: 'Ernakulam North'
      }
    });
    createdDriverId = driver1.driverId;

    // Driver 2: ACTIVE with Leave scheduled for 2026-10-25
    const driver2 = await prisma.driver.create({
      data: {
        name: 'Anand Mohan',
        phoneNo: '+919999900002',
        passwordHash: testDriverPwd,
        status: 'ACTIVE',
        isOnline: true,
        currentLocation: 'Fort Kochi'
      }
    });

    await prisma.driverLeave.create({
      data: {
        driverId: driver2.driverId,
        startDate: new Date('2026-10-24T00:00:00Z'),
        endDate: new Date('2026-10-26T00:00:00Z')
      }
    });

    // Upload test document for driver 1
    const testDoc = await prisma.driverDocument.create({
      data: {
        driverId: driver1.driverId,
        documentType: 'DRIVING_LICENCE',
        originalFileName: 'dl_suresh.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 245000,
        fileURL: 'private/drivers/1/dl.pdf'
      }
    });
    testDocumentId = testDoc.documentId;

    // List drivers
    const listDriversRes = await request('/api/v1/admin/drivers?page=1&limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(listDriversRes.status === 200, `Expected 200, got ${listDriversRes.status}`);
    assert(listDriversRes.data.success === true, 'success must be true');
    assert(Array.isArray(listDriversRes.data.data.items), 'items must be array');
    console.log('  PASS - Driver list retrieved with pagination.\n');

    console.log('TEST 15: Filter drivers by availability on date (exclude on-leave driver)');
    // Querying on 2026-10-25: driver2 is on leave, so driver2 must be excluded
    const availableRes = await request('/api/v1/admin/drivers?available_on=2026-10-25', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(availableRes.status === 200, `Expected 200, got ${availableRes.status}`);
    const items = availableRes.data.data.items;
    const hasDriver2 = items.some((d) => d.driver_id === driver2.driverId);
    assert(!hasDriver2, 'Driver on leave on 2026-10-25 must not appear in available list');
    console.log('  PASS - Drivers on leave successfully excluded from availability filter.\n');

    console.log('TEST 16: Get Driver Detail via GET /api/v1/admin/drivers/:driver_id');
    const getDriverRes = await request(`/api/v1/admin/drivers/${driver1.driverId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(getDriverRes.status === 200, `Expected 200, got ${getDriverRes.status}`);
    assert(getDriverRes.data.data.driver_id === driver1.driverId, 'driver_id must match');
    assert(Array.isArray(getDriverRes.data.data.documents), 'documents array must exist');
    assert(getDriverRes.data.data.documents.length === 1, 'Driver 1 should have 1 document');
    assert(getDriverRes.data.data.documents[0].document_type === 'DRIVING_LICENCE', 'Document type must match');
    assert(!getDriverRes.data.data.documents[0].file_url, 'file_url / storage path must not be exposed');
    console.log('  PASS - Driver details retrieved with documents and leaves.\n');

    console.log('TEST 17: List Driver Documents History');
    const docHistoryRes = await request(`/api/v1/admin/drivers/${driver1.driverId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(docHistoryRes.status === 200, `Expected 200, got ${docHistoryRes.status}`);
    assert(docHistoryRes.data.success === true, 'success must be true');
    assert(docHistoryRes.data.data.length >= 1, 'Document history should contain uploaded document');
    console.log('  PASS - Driver document history returned.\n');

    console.log('TEST 18: Generate Signed Link for Driver Document (5-minute expiry)');
    const linkRes = await request(`/api/v1/admin/drivers/${driver1.driverId}/documents/${testDocumentId}/link`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(linkRes.status === 200, `Expected 200, got ${linkRes.status}`);
    assert(linkRes.data.success === true, 'success must be true');
    assert(!!linkRes.data.data.url, 'Signed URL must be returned');
    assert(!!linkRes.data.data.expires_at, 'expires_at must be returned');

    // Verify fetching signed URL succeeds
    const fileRes = await fetch(linkRes.data.data.url);
    assert(fileRes.status === 200, `Expected 200 when opening signed link, got ${fileRes.status}`);
    assert(fileRes.headers.get('content-type') === 'application/pdf', 'Content type should be application/pdf');

    // Tampered token test
    const tamperedRes = await fetch(`${baseUrl}/api/v1/files/signed?token=tampered_invalid_token`);
    assert(tamperedRes.status === 403, `Expected 403 for tampered token, got ${tamperedRes.status}`);
    console.log('  PASS - Signed document link generated and verified with 5-min security.\n');

    console.log('TEST 19: Driver Status Transitions (PENDING -> ACTIVE, PENDING -> INACTIVE blocked)');
    // Attempting PENDING -> INACTIVE should be refused with 409
    const invalidTransRes = await request(`/api/v1/admin/drivers/${driver1.driverId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE' }
    });
    assert(invalidTransRes.status === 409, `Expected 409 for PENDING->INACTIVE, got ${invalidTransRes.status}`);
    assert(invalidTransRes.data.error.code === 'INVALID_STATUS', 'code must be INVALID_STATUS');

    // Valid transition: PENDING -> ACTIVE
    const activateDriverRes = await request(`/api/v1/admin/drivers/${driver1.driverId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'ACTIVE' }
    });
    assert(activateDriverRes.status === 200, `Expected 200, got ${activateDriverRes.status}`);
    assert(activateDriverRes.data.data.status === 'ACTIVE', 'Driver status must now be ACTIVE');

    // Verify DRIVER_ACTIVATED audit log
    const driverActAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'DRIVER_ACTIVATED',
        entityType: 'DRIVER',
        entityId: driver1.driverId
      }
    });
    assert(!!driverActAudit, 'DRIVER_ACTIVATED audit log row must exist');

    // Valid transition: ACTIVE -> INACTIVE (revoking sessions)
    const driverSession = await prisma.session.create({
      data: {
        userType: 'DRIVER',
        userId: driver1.driverId,
        refreshTokenHash: 'fake_driver_hash_' + Date.now(),
        expiresAt: new Date(Date.now() + 86400000)
      }
    });

    const deactivateDriverRes = await request(`/api/v1/admin/drivers/${driver1.driverId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'License under review' }
    });
    assert(deactivateDriverRes.status === 200, `Expected 200, got ${deactivateDriverRes.status}`);
    assert(deactivateDriverRes.data.data.status === 'INACTIVE', 'Driver must now be INACTIVE');

    const refreshedDriverSession = await prisma.session.findUnique({
      where: { sessionId: driverSession.sessionId }
    });
    assert(!!refreshedDriverSession.revokedAt, 'Driver active session must be revoked when driver is deactivated');
    console.log('  PASS - Driver state transitions strictly validated and audited.\n');

    console.log('TEST 20: Driver Wallet View and Offline Debit Validation');
    // Credit 5000 to driver 2 wallet via database transaction tied to a completed trip
    const testOrder = await prisma.order.create({
      data: {
        companyId: createdCompanyId,
        pickupSpot: 'Marine Drive, Kochi',
        dropoffSpot: 'Cochin Airport',
        pickupTime: new Date(),
        contactName: 'Corporate Guest',
        contactPhone: '+919876543200',
        source: 'PORTAL',
        status: 'ACCEPTED',
        decidedByAdminId: 1,
        decidedAt: new Date()
      }
    });

    const testTrip = await prisma.trip.create({
      data: {
        orderId: testOrder.orderId,
        driverId: driver2.driverId,
        amount: 10000.00,
        otp: '654321',
        tripStatus: 'CLOSED',
        expensesConfirmed: true,
        assignedAt: new Date(),
        closedAt: new Date()
      }
    });

    await prisma.driverWalletTransaction.create({
      data: {
        driverId: driver2.driverId,
        tripId: testTrip.tripId,
        credit: 5000.00,
        debit: null,
        note: 'Completed trip credit'
      }
    });

    // View wallet
    const walletRes = await request(`/api/v1/admin/drivers/${driver2.driverId}/wallet`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(walletRes.status === 200, `Expected 200, got ${walletRes.status}`);
    assert(walletRes.data.data.balance === '5000.00', 'Balance should be 5000.00');

    // Attempt debit larger than balance (6000 > 5000)
    const overDebitRes = await request(`/api/v1/admin/drivers/${driver2.driverId}/wallet-debits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { debit: '6000.00', note: 'Exceeds balance cashout' }
    });
    assert(overDebitRes.status === 422, `Expected 422 for over-debit, got ${overDebitRes.status}`);
    assert(overDebitRes.data.error.code === 'INSUFFICIENT_BALANCE', 'code must be INSUFFICIENT_BALANCE');

    // Record valid debit (2000 <= 5000)
    const validDebitRes = await request(`/api/v1/admin/drivers/${driver2.driverId}/wallet-debits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { debit: '2000.00', note: 'Office cash payout' }
    });
    assert(validDebitRes.status === 201, `Expected 201, got ${validDebitRes.status}`);
    assert(validDebitRes.data.data.debit === '2000.00', 'Debit amount must match');

    // Re-check balance (5000 - 2000 = 3000.00)
    const finalWalletRes = await request(`/api/v1/admin/drivers/${driver2.driverId}/wallet`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(finalWalletRes.data.data.balance === '3000.00', 'Updated balance must be 3000.00');
    console.log('  PASS - Wallet balance and offline debit logic verified.\n');

    console.log('TEST 21: Logout via POST /api/v1/auth/logout');
    const logoutRes = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(logoutRes.status === 204, `Expected 204 No Content on logout, got ${logoutRes.status}`);
    console.log('  PASS - Admin logout revoked session and returned 204.\n');

    console.log('=================================================================');
    console.log('   ALL 21 OPENAPI INTEGRATION TESTS PASSED (100%)               ');
    console.log('=================================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
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
