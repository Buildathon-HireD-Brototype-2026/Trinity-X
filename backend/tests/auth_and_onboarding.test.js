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
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('=================================================================');
  console.log('   HIRED AUTHENTICATION & ONBOARDING AUTOMATED TEST SUITE        ');
  console.log('=================================================================\n');

  // Start app on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[test-runner] Test server started at ${baseUrl}\n`);
      resolve();
    });
  });

  let adminAccessToken = '';
  let adminRefreshToken = '';
  let partnerAccessToken = '';
  let partnerRefreshToken = '';
  let driverAccessToken = '';
  let partnerSetupToken = '';
  let driverSetupToken = '';
  const defaultOffice = await prisma.office.findFirst();
  const testOfficeId = defaultOffice?.officeId || 1;

  // Reset admin1 password to known seed password
  const adminSeedHash = await hashPassword('Admin@12345');
  await prisma.admin.updateMany({
    where: { emailId: 'admin1@hired.com' },
    data: { passwordHash: adminSeedHash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
  });

  // Clean up any test records from prior runs to ensure idempotency
  await prisma.companyRegistrationRequest.deleteMany({
    where: { emailId: 'partner@apexlogistics.com' }
  });
  const priorCompany = await prisma.company.findFirst({
    where: { emailId: 'partner@apexlogistics.com' }
  });
  if (priorCompany) {
    const priorOrders = await prisma.order.findMany({ where: { companyId: priorCompany.companyId } });
    const priorOrderIds = priorOrders.map((o) => o.orderId);
    if (priorOrderIds.length > 0) {
      const priorTrips = await prisma.trip.findMany({ where: { orderId: { in: priorOrderIds } } });
      const priorTripIds = priorTrips.map((t) => t.tripId);
      if (priorTripIds.length > 0) {
        await prisma.driverWalletTransaction.deleteMany({ where: { tripId: { in: priorTripIds } } });
        await prisma.driverLocationHistory.deleteMany({ where: { tripId: { in: priorTripIds } } });
        await prisma.tripPayroll.deleteMany({ where: { tripId: { in: priorTripIds } } });
        await prisma.tripSosAlert.deleteMany({ where: { tripId: { in: priorTripIds } } });
        await prisma.expense.deleteMany({ where: { tripId: { in: priorTripIds } } });
      }
      await prisma.tripSosAlert.deleteMany({ where: { orderId: { in: priorOrderIds } } });
      await prisma.trip.deleteMany({ where: { orderId: { in: priorOrderIds } } });
      await prisma.order.deleteMany({ where: { orderId: { in: priorOrderIds } } });
    }
    await prisma.tripPayroll.deleteMany({ where: { invoice: { companyId: priorCompany.companyId } } });
    await prisma.invoice.deleteMany({ where: { companyId: priorCompany.companyId } });
    await prisma.session.deleteMany({ where: { userType: 'PARTNER', userId: priorCompany.companyId } });
    await prisma.company.delete({ where: { companyId: priorCompany.companyId } });
  }
  await prisma.driver.deleteMany({
    where: { phoneNo: '+919123456789' }
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Admin Login (Success)
    // -------------------------------------------------------------
    console.log('TEST 1: Admin Login with valid credentials');
    const adminLoginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin1@hired.com', password: 'Admin@12345' }
    });
    if (adminLoginRes.status !== 200) {
      console.log('FAILED RESPONSE:', adminLoginRes.data);
    }
    assert(adminLoginRes.status === 200, `Expected 200, got ${adminLoginRes.status}`);
    assert(adminLoginRes.data.status === 'ok', 'Status should be ok');
    assert(!!adminLoginRes.data.data.accessToken, 'Access token missing');
    assert(!!adminLoginRes.data.data.refreshToken, 'Refresh token missing');
    assert(adminLoginRes.data.data.user.userType === 'ADMIN', 'userType should be ADMIN');
    assert(!adminLoginRes.data.data.user.passwordHash, 'passwordHash must never be returned');
    adminAccessToken = adminLoginRes.data.data.accessToken;
    adminRefreshToken = adminLoginRes.data.data.refreshToken;
    console.log('  PASS - Admin logged in, tokens received, credentials safe.\n');

    // -------------------------------------------------------------
    // TEST 2: GET /auth/me for Admin
    // -------------------------------------------------------------
    console.log('TEST 2: GET /auth/me with valid Bearer token');
    const meRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(meRes.status === 200, `Expected 200, got ${meRes.status}`);
    assert(meRes.data.data.user.emailId === 'admin1@hired.com', 'Email should match');
    assert(!meRes.data.data.user.passwordHash, 'passwordHash must not leak');
    console.log('  PASS - Safe profile returned for authenticated admin.\n');

    // -------------------------------------------------------------
    // TEST 3: Invalid Admin Credentials & Generic Error
    // -------------------------------------------------------------
    console.log('TEST 3: Admin Login with invalid credentials');
    const invalidAdminRes = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin1@hired.com', password: 'WrongPassword123' }
    });
    assert(invalidAdminRes.status === 401, `Expected 401, got ${invalidAdminRes.status}`);
    assert(invalidAdminRes.data.message === 'Invalid credentials.', 'Message should be generic');
    console.log('  PASS - Generic 401 error returned without leaking account details.\n');

    // -------------------------------------------------------------
    // TEST 4: Lockout after 5 Failed Attempts
    // -------------------------------------------------------------
    console.log('TEST 4: Account Lockout after 5 consecutive failed attempts');
    // We already did 1 failed attempt, do 4 more to hit threshold 5
    for (let i = 2; i <= 5; i++) {
      await request('/auth/admin/login', {
        method: 'POST',
        body: { email: 'admin1@hired.com', password: 'WrongPassword123' }
      });
    }
    const lockedRes = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin1@hired.com', password: 'Admin@12345' } // Even correct password should be locked!
    });
    assert(lockedRes.status === 403, `Expected 403 locked, got ${lockedRes.status}`);
    assert(lockedRes.data.message.includes('locked'), 'Message should indicate account lockout');
    console.log('  PASS - Account locked after 5 failed attempts.\n');

    // Reset admin1 lockout in database for subsequent tests
    await prisma.admin.update({
      where: { emailId: 'admin1@hired.com' },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    // -------------------------------------------------------------
    // TEST 5: Failed Login Counter Reset on Success
    // -------------------------------------------------------------
    console.log('TEST 5: Failed login counter reset on success');
    // Fail once
    await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin1@hired.com', password: 'Bad' }
    });
    let adminDb = await prisma.admin.findUnique({ where: { emailId: 'admin1@hired.com' } });
    assert(adminDb.failedLoginAttempts === 1, 'Should have 1 failed attempt');
    // Succeed once
    const loginOk = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin1@hired.com', password: 'Admin@12345' }
    });
    assert(loginOk.status === 200, 'Login should succeed');
    adminAccessToken = loginOk.data.data.accessToken;
    adminRefreshToken = loginOk.data.data.refreshToken;
    adminDb = await prisma.admin.findUnique({ where: { emailId: 'admin1@hired.com' } });
    assert(adminDb.failedLoginAttempts === 0, 'Failed attempts should be reset to 0');
    console.log('  PASS - Failed login attempts reset to 0 after valid login.\n');

    // -------------------------------------------------------------
    // TEST 6: Public Partner Registration Flow
    // -------------------------------------------------------------
    console.log('TEST 6: Public Partner Registration (Pending Status)');
    const regRes = await request('/auth/partner/register', {
      method: 'POST',
      body: {
        companyName: 'Apex Logistics Ltd',
        address: '100 Harbor Road, Kochi',
        contactPerson: 'Karan Sharma',
        phoneNo: '+919988776655',
        emailId: 'partner@apexlogistics.com',
        companyLocation: 'Kochi Port',
        notes: 'Fleet partner with 25 vehicles'
      }
    });
    assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
    const requestId = regRes.data.data.requestId;
    assert(!!requestId, 'requestId should be returned');

    // Verify company cannot immediately log in!
    const prematureLogin = await request('/auth/partner/login', {
      method: 'POST',
      body: { email: 'partner@apexlogistics.com', password: 'AnyPassword' }
    });
    assert(prematureLogin.status === 401, 'Unapproved partner must not have a login account');
    console.log('  PASS - Registration submitted as PENDING. Immediate login blocked.\n');

    // -------------------------------------------------------------
    // TEST 7: Admin Reviews and Approves Partner Registration
    // -------------------------------------------------------------
    console.log('TEST 7: Admin reviews and approves Partner registration');
    // Non-admin attempt should be 403 Forbidden
    const unauthApprove = await request(`/admin/partner-registrations/${requestId}/approve`, {
      method: 'PATCH',
      body: { officeId: 1, hiredSplit: 70, driverSplit: 30 }
    });
    assert(unauthApprove.status === 401, 'Unauthorized request should be 401');

    // Admin approves
    const approveRes = await request(`/admin/partner-registrations/${requestId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { officeId: testOfficeId, hiredSplit: 70, driverSplit: 30 }
    });
    if (approveRes.status !== 200) {
      console.log('Approve failure:', approveRes.data);
    }
    assert(approveRes.status === 200, `Expected 200, got ${approveRes.status}`);
    assert(!!approveRes.data.data.setupToken, 'Setup token should be generated on approval');
    partnerSetupToken = approveRes.data.data.setupToken;
    console.log('  PASS - Partner approved by admin. Setup token created.\n');

    // -------------------------------------------------------------
    // TEST 8: Partner Password Setup via Token
    // -------------------------------------------------------------
    console.log('TEST 8: Partner establishes password via setup token');
    const partnerSetupRes = await request('/auth/partner/password/setup', {
      method: 'POST',
      body: { token: partnerSetupToken, password: 'Partner@12345' }
    });
    assert(partnerSetupRes.status === 200, `Expected 200, got ${partnerSetupRes.status}`);

    // Reusing the token must fail!
    const reuseTokenRes = await request('/auth/partner/password/setup', {
      method: 'POST',
      body: { token: partnerSetupToken, password: 'Partner@12345' }
    });
    assert(reuseTokenRes.status === 400, 'Reused setup token must be rejected');
    console.log('  PASS - Partner password established. Single-use token invalidated.\n');

    // -------------------------------------------------------------
    // TEST 9: Partner Login (Success)
    // -------------------------------------------------------------
    console.log('TEST 9: Partner Login with newly set credentials');
    const partnerLoginRes = await request('/auth/partner/login', {
      method: 'POST',
      body: { email: 'partner@apexlogistics.com', password: 'Partner@12345' }
    });
    assert(partnerLoginRes.status === 200, `Expected 200, got ${partnerLoginRes.status}`);
    assert(partnerLoginRes.data.data.user.userType === 'PARTNER', 'Role should be PARTNER');
    partnerAccessToken = partnerLoginRes.data.data.accessToken;
    partnerRefreshToken = partnerLoginRes.data.data.refreshToken;
    console.log('  PASS - Partner successfully authenticated.\n');

    // -------------------------------------------------------------
    // TEST 10: Cross-Role Protection (Partner cannot access Admin routes)
    // -------------------------------------------------------------
    console.log('TEST 10: Cross-Role Protection (Partner calling Admin route)');
    const crossRoleRes = await request('/admin/partner-registrations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${partnerAccessToken}` }
    });
    assert(crossRoleRes.status === 403, `Expected 403 Forbidden, got ${crossRoleRes.status}`);
    console.log('  PASS - Access denied when non-admin accesses admin endpoints.\n');

    // -------------------------------------------------------------
    // TEST 11: Admin Creates Driver Account (Starts in PENDING)
    // -------------------------------------------------------------
    console.log('TEST 11: Admin creates Driver account');
    const createDriverRes = await request('/admin/drivers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        name: 'Rahul Nair',
        phoneNo: '+919123456789',
        currentLocation: 'Edappally, Kochi'
      }
    });
    assert(createDriverRes.status === 201, `Expected 201, got ${createDriverRes.status}`);
    const driverId = createDriverRes.data.data.driver.driverId;
    assert(createDriverRes.data.data.driver.status === 'PENDING', 'New driver must be PENDING');

    // PENDING driver must NOT be able to log in!
    const pendingDriverLogin = await request('/auth/driver/login', {
      method: 'POST',
      body: { phoneNo: '+919123456789', password: 'AnyPassword' }
    });
    assert(pendingDriverLogin.status === 403, 'Pending driver login must be rejected (403)');
    console.log('  PASS - Driver created in PENDING status. Login blocked.\n');

    // -------------------------------------------------------------
    // TEST 12: Admin Activates Driver & Password Setup
    // -------------------------------------------------------------
    console.log('TEST 12: Admin activates Driver and Driver sets password');
    const activateDriverRes = await request(`/admin/drivers/${driverId}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(activateDriverRes.status === 200, `Expected 200, got ${activateDriverRes.status}`);
    assert(activateDriverRes.data.data.driver.status === 'ACTIVE', 'Driver status should be ACTIVE');
    driverSetupToken = activateDriverRes.data.data.setupToken;

    // Driver sets password
    const driverSetupRes = await request('/auth/driver/password/setup', {
      method: 'POST',
      body: { token: driverSetupToken, password: 'Driver@12345' }
    });
    assert(driverSetupRes.status === 200, 'Driver password setup should succeed');

    // Driver logs in
    const driverLoginRes = await request('/auth/driver/login', {
      method: 'POST',
      body: { phoneNo: '+919123456789', password: 'Driver@12345' }
    });
    assert(driverLoginRes.status === 200, `Expected 200, got ${driverLoginRes.status}`);
    assert(driverLoginRes.data.data.user.userType === 'DRIVER', 'User type should be DRIVER');
    driverAccessToken = driverLoginRes.data.data.accessToken;
    console.log('  PASS - Driver activated and authenticated successfully.\n');

    // -------------------------------------------------------------
    // TEST 13: Refresh Token Rotation & Replay Attack Detection
    // -------------------------------------------------------------
    console.log('TEST 13: Refresh Token Rotation and Replay Detection');
    const refreshRes = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: partnerRefreshToken }
    });
    if (refreshRes.status !== 200) {
      console.log('Refresh failure response:', refreshRes.data);
    }
    assert(refreshRes.status === 200, `Expected 200, got ${refreshRes.status}`);
    assert(!!refreshRes.data.data.accessToken, 'New access token missing');
    assert(!!refreshRes.data.data.refreshToken, 'New refresh token missing');
    const rotatedRefreshToken = refreshRes.data.data.refreshToken;

    // REPLAY ATTACK: Trying to use the OLD partnerRefreshToken again must be rejected!
    const replayRes = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: partnerRefreshToken }
    });
    assert(replayRes.status === 401, 'Replayed refresh token must be rejected with 401');
    console.log('  PASS - Refresh token safely rotated; replay attempt rejected.\n');

    // -------------------------------------------------------------
    // TEST 14: Logout Revocation
    // -------------------------------------------------------------
    console.log('TEST 14: Logout session revocation');
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      body: { refreshToken: rotatedRefreshToken }
    });
    assert(logoutRes.status === 200, 'Logout should return 200');

    // Using the logged-out refresh token must fail
    const postLogoutRefresh = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: rotatedRefreshToken }
    });
    assert(postLogoutRefresh.status === 401, 'Revoked token after logout must fail');
    console.log('  PASS - Session revoked on logout; subsequent refresh blocked.\n');

    // -------------------------------------------------------------
    // TEST 15: Inactive Account Login Block
    // -------------------------------------------------------------
    console.log('TEST 15: Inactive Account Login Prevention');
    // Deactivate driver in DB
    await prisma.driver.update({
      where: { driverId },
      data: { status: 'INACTIVE' }
    });
    const inactiveLogin = await request('/auth/driver/login', {
      method: 'POST',
      body: { phoneNo: '+919123456789', password: 'Driver@12345' }
    });
    assert(inactiveLogin.status === 403, 'Inactive account login must be blocked (403)');
    console.log('  PASS - Inactive driver login blocked.\n');

    console.log('=================================================================');
    console.log('   ALL 15 AUTHENTICATION & ONBOARDING TESTS PASSED (100%)       ');
    console.log('=================================================================');
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

