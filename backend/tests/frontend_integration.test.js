import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/server.js';
import prisma from '../src/config/db.js';
import { hashPassword } from '../src/shared/security.js';

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[test-runner] Integration test server running at ${baseUrl}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...options.headers };

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Buffer)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

// Global fixtures
let adminToken = '';
let adminUser = null;
let admin2User = null;
let partnerToken = '';
let partnerCompany = null;
let partner2Token = '';
let partner2Company = null;
let driverToken = '';
let driverUser = null;
let testOrderId = null;
let testTripId = null;
let testOtp = null;
let testNotificationId = null;

test('Setup seed database for frontend integration tests', async () => {
  await startServer();

  let office = await prisma.office.findFirst();
  if (!office) {
    office = await prisma.office.create({
      data: { officeName: 'Test HQ', officeLocation: 'Test Location' }
    });
  }

  const pwdHash = await hashPassword('Password@123');

  // 1. Admin 1 (Primary)
  adminUser = await prisma.admin.findFirst({
    where: { emailId: 'admin1@hired.com' }
  });
  if (!adminUser) {
    adminUser = await prisma.admin.create({
      data: {
        officeId: office.officeId,
        adminName: 'Test Admin',
        emailId: 'admin1@hired.com',
        phoneNo: '+919876543210',
        passwordHash: pwdHash,
        status: 'ACTIVE'
      }
    });
  } else {
    adminUser = await prisma.admin.update({
      where: { adminId: adminUser.adminId },
      data: { passwordHash: pwdHash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  // 1b. Admin 2 (Dual-approval verification)
  admin2User = await prisma.admin.findFirst({
    where: { emailId: 'admin2@hired.com' }
  });
  if (!admin2User) {
    admin2User = await prisma.admin.create({
      data: {
        officeId: office.officeId,
        adminName: 'Test Admin Two',
        emailId: 'admin2@hired.com',
        phoneNo: '+919876543211',
        passwordHash: pwdHash,
        status: 'ACTIVE'
      }
    });
  } else {
    admin2User = await prisma.admin.update({
      where: { adminId: admin2User.adminId },
      data: { passwordHash: pwdHash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  // 2. Partner 1 (Apex Logistics)
  partnerCompany = await prisma.company.findFirst({
    where: { emailId: 'partner@apexlogistics.com' }
  });
  if (!partnerCompany) {
    partnerCompany = await prisma.company.create({
      data: {
        name: 'Apex Logistics Ltd',
        emailId: 'partner@apexlogistics.com',
        passwordHash: pwdHash,
        status: 'ACTIVE',
        officeId: office.officeId,
        hiredSplit: 70.00,
        driverSplit: 30.00
      }
    });
  } else {
    partnerCompany = await prisma.company.update({
      where: { companyId: partnerCompany.companyId },
      data: { passwordHash: pwdHash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  // 3. Partner 2 (Tenant isolation tests)
  const p2Email = 'partner2@tenant-test.com';
  partner2Company = await prisma.company.findFirst({
    where: { emailId: p2Email }
  });
  if (!partner2Company) {
    partner2Company = await prisma.company.create({
      data: {
        name: 'Tenant Isolation Corp',
        emailId: p2Email,
        passwordHash: pwdHash,
        status: 'ACTIVE',
        officeId: office.officeId,
        hiredSplit: 75.00,
        driverSplit: 25.00
      }
    });
  } else {
    partner2Company = await prisma.company.update({
      where: { companyId: partner2Company.companyId },
      data: { passwordHash: pwdHash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  // 4. Driver (Active)
  const driverPhone = '+919876543210';
  driverUser = await prisma.driver.findFirst({
    where: { phoneNo: driverPhone }
  });
  if (!driverUser) {
    driverUser = await prisma.driver.create({
      data: {
        name: 'Rajesh Kumar Chauffeur',
        phoneNo: driverPhone,
        passwordHash: pwdHash,
        status: 'ACTIVE',
        isOnline: true
      }
    });
  } else {
    driverUser = await prisma.driver.update({
      where: { driverId: driverUser.driverId },
      data: { passwordHash: pwdHash, status: 'ACTIVE', isOnline: true, failedLoginAttempts: 0, lockedUntil: null }
    });
  }
});

// ============================================================================
// PARTNER / B2B PORTAL INTEGRATION TESTS
// ============================================================================

test('B2B 1: Partner logs in via unified POST /api/v1/auth/login and receives token and company payload', async () => {
  const res = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: 'partner@apexlogistics.com',
      password: 'Password@123',
      user_type: 'PARTNER'
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.token, 'Must return token at response.data.token for B2B portal');
  assert.ok(res.data.company, 'Must return company at response.data.company for B2B portal');
  assert.equal(res.data.company.company_id, partnerCompany.companyId);

  partnerToken = res.data.token;
});

test('B2B 2: Partner 2 logs in to establish secondary session', async () => {
  const res = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: 'partner2@tenant-test.com',
      password: 'Password@123',
      user_type: 'PARTNER'
    }
  });

  assert.equal(res.status, 200);
  partner2Token = res.data.token;
});

test('B2B 3: Partner creates a transport order via POST /api/v1/orders', async () => {
  const orderPayload = {
    pickup_spot: 'Cyber City Tower C, DLF Phase 2, Gurugram',
    dropoff_spot: 'Terminal 3 International Departures, IGI Airport, New Delhi',
    pickup_time: new Date(Date.now() + 86400000).toISOString(),
    contact_name: 'Vikrant Roy',
    contact_phone: '+91 98450 12345',
    notes: 'Executive guest transfer; sedan vehicle required.'
  };

  const res = await request('/api/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${partnerToken}` },
    body: orderPayload
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.order, 'Must return order at response.data.order for B2B portal CreateOrderPage');
  assert.equal(res.data.order.status, 'RECEIVED');
  assert.equal(res.data.order.pickup_spot, orderPayload.pickup_spot);

  testOrderId = res.data.order.order_id;
});

test('B2B 4: Partner lists orders via GET /api/v1/orders', async () => {
  const res = await request('/api/v1/orders', {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.orders), 'Must return orders array at response.data.orders for B2B portal');
  assert.ok(res.data.orders.some((o) => o.order_id === testOrderId));
});

test('B2B 5: Partner retrieves order detail via GET /api/v1/orders/:order_id', async () => {
  const res = await request(`/api/v1/orders/${testOrderId}`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.order_id, testOrderId);
  assert.equal(res.data.status, 'RECEIVED');
});

test('B2B 6: Tenant isolation - Partner 2 cannot access Partner 1 order (404 NOT_FOUND)', async () => {
  const res = await request(`/api/v1/orders/${testOrderId}`, {
    headers: { Authorization: `Bearer ${partner2Token}` }
  });

  assert.equal(res.status, 404);
});

// ============================================================================
// ADMIN PORTAL INTEGRATION TESTS
// ============================================================================

test('Admin 1: Admin logs in via POST /api/v1/auth/admin/login', async () => {
  const res = await request('/api/v1/auth/admin/login', {
    method: 'POST',
    body: {
      email_id: 'admin1@hired.com',
      password: 'Password@123'
    }
  });

  assert.equal(res.status, 200);
  adminToken = res.data.data.access_token;
});

test('Admin 2: Admin views order inbox via GET /api/v1/admin/orders', async () => {
  const res = await request('/api/v1/admin/orders?status=RECEIVED', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.orders));
  assert.ok(res.data.orders.some((o) => o.order_id === testOrderId));
});

test('Admin 3: Admin accepts order via POST /api/v1/admin/orders/:order_id/accept', async () => {
  const res = await request(`/api/v1/admin/orders/${testOrderId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      amount: 1450.00
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.order.status, 'ACCEPTED');
  assert.ok(res.data.data.trip, 'Accepting order must return trip');
  assert.equal(res.data.data.trip.status, 'UNASSIGNED');
  assert.ok(res.data.data.trip.otp, 'Must generate 6-digit OTP');

  testTripId = res.data.data.trip.trip_id;
  testOtp = res.data.data.trip.otp;
});

test('Admin 4: Order acceptance creates partner notification', async () => {
  const res = await request('/api/v1/notifications', {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.notifications));
  const acceptNotif = res.data.notifications.find((n) => n.type === 'ORDER_ACCEPTED' && n.entity_id === testOrderId);
  assert.ok(acceptNotif, 'ORDER_ACCEPTED notification must exist for partner');
  assert.equal(acceptNotif.is_read, false);

  testNotificationId = acceptNotif.notification_id;
});

test('Admin 5: Admin assigns active driver to trip via POST /api/v1/admin/trips/:trip_id/assign-driver', async () => {
  const res = await request(`/api/v1/admin/trips/${testTripId}/assign-driver`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      driver_id: driverUser.driverId
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.data.trip.status, 'ASSIGNED');
  assert.equal(res.data.data.trip.driver_id, driverUser.driverId);
});

// ============================================================================
// DRIVER APP INTEGRATION TESTS
// ============================================================================

test('Driver 1: Driver logs in via unified POST /api/v1/auth/login with phone and password', async () => {
  const res = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      phone: '9876543210',
      password: 'Password@123',
      user_type: 'DRIVER'
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.token);
  assert.ok(res.data.driver);

  driverToken = res.data.token;
});

test('Driver 2: Driver retrieves own profile via GET /api/v1/driver/profile', async () => {
  const res = await request('/api/v1/driver/profile', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.data.driver_id, driverUser.driverId);
  assert.equal(res.data.data.name, driverUser.name);
});

test('Driver 3: Driver toggles duty availability via PATCH /api/v1/driver/availability', async () => {
  // Toggle offline
  const resOffline = await request('/api/v1/driver/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: { is_online: false }
  });

  assert.equal(resOffline.status, 200);
  assert.equal(resOffline.data.data.is_online, false);

  // Toggle online
  const resOnline = await request('/api/v1/driver/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: { is_online: true }
  });

  assert.equal(resOnline.status, 200);
  assert.equal(resOnline.data.data.is_online, true);
});

test('Driver 4: Driver uploads KYC document via POST /api/v1/driver/documents', async () => {
  // Create mock multipart payload
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = 'Sample simulated document buffer';
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="document_type"',
    '',
    'DL_FRONT',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="license_front.jpg"',
    'Content-Type: image/jpeg',
    '',
    fileContent,
    `--${boundary}--`
  ].join('\r\n');

  const res = await request('/api/v1/driver/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${driverToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: Buffer.from(body)
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.data.document_type, 'DRIVING_LICENCE');
  assert.equal(res.data.data.original_file_name, 'license_front.jpg');
});

test('Driver 5: Driver lists own documents via GET /api/v1/driver/documents', async () => {
  const res = await request('/api/v1/driver/documents', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.data));
  assert.ok(res.data.data.some((d) => d.document_type === 'DRIVING_LICENCE'));
});

test('Driver 6: Driver lists assigned trips via GET /api/v1/driver/trips', async () => {
  const res = await request('/api/v1/driver/trips?status=ASSIGNED', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.data.items));
  const assignedTrip = res.data.data.items.find((t) => Number(t.trip_id) === testTripId);
  assert.ok(assignedTrip, 'Trip assigned by admin must appear in driver trip roster');
  assert.equal(assignedTrip.status, 'ASSIGNED');
});

test('Driver 7: Driver starts assigned trip via POST /api/v1/driver/trips/:trip_id/start', async () => {
  const res = await request(`/api/v1/driver/trips/${testTripId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: {
      selfie_url: 'https://hired.storage/selfies/driver101_start.jpg'
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.data.status, 'ONGOING');
});

test('Driver 8: Driver attempts trip closure with wrong OTP (rejected with 400)', async () => {
  const res = await request(`/api/v1/driver/trips/${testTripId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: {
      otp: '000000' // wrong OTP
    }
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error.code, 'INVALID_OTP');
});

test('Driver 9: Driver completes trip with valid 6-digit OTP via POST /api/v1/driver/trips/:trip_id/close', async () => {
  const res = await request(`/api/v1/driver/trips/${testTripId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: {
      otp: testOtp
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.data.status, 'CLOSED');

  // Verify database: TripPayroll created and DriverWalletTransaction credited
  const payroll = await prisma.tripPayroll.findUnique({
    where: { tripId: testTripId }
  });
  assert.ok(payroll, 'TripPayroll record must be created');
  assert.equal(Number(payroll.driverShare), (1450.00 * 30.00) / 100);

  const walletTx = await prisma.driverWalletTransaction.findFirst({
    where: { tripId: testTripId }
  });
  assert.ok(walletTx, 'DriverWalletTransaction must be credited');
  assert.equal(Number(walletTx.credit), (1450.00 * 30.00) / 100);
});

// ============================================================================
// POST-TRIP REPORTS & NOTIFICATIONS VERIFICATION
// ============================================================================

test('B2B 7: Partner views closed trip report via GET /api/v1/reports/trips?status=CLOSED', async () => {
  const res = await request('/api/v1/reports/trips?status=CLOSED', {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.reports));
  const rep = res.data.reports.find((r) => r.trip_id === testTripId);
  assert.ok(rep, 'Closed trip report must exist for partner');
  assert.equal(rep.amount, '1450.00');
  // Strict PRD security rule: driver splits must NOT be exposed in trip reports
  assert.equal(rep.driver_share, undefined);
  assert.equal(rep.driver_split, undefined);
});

test('B2B 8: Partner marks notification as read via PATCH /api/v1/notifications/:id/read', async () => {
  const res = await request(`/api/v1/notifications/${testNotificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.data.is_read, true);
});

test('B2B 9: Partner marks all notifications as read via POST /api/v1/notifications/mark-all-read', async () => {
  const res = await request('/api/v1/notifications/mark-all-read', {
    method: 'POST',
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
});

// ============================================================================
// STATEMENTS / INVOICES VERIFICATION
// ============================================================================

test('B2B 10: Published statements listing strictly excludes DRAFT invoices', async () => {
  await prisma.invoice.deleteMany({
    where: {
      companyId: partnerCompany.companyId,
      periodMonth: { in: ['2026-10', '2026-09'] }
    }
  });

  // Create a DRAFT invoice
  const draftInvoice = await prisma.invoice.create({
    data: {
      companyId: partnerCompany.companyId,
      periodMonth: '2026-10',
      status: 'DRAFT',
      createdAdmin: adminUser.adminId,
      totalAmount: 1450.00,
      totalDriverShare: 435.00,
      totalCompanyShare: 1015.00
    }
  });

  // Create a PUBLISHED invoice
  const publishedInvoice = await prisma.invoice.create({
    data: {
      companyId: partnerCompany.companyId,
      periodMonth: '2026-09',
      status: 'PUBLISHED',
      createdAdmin: adminUser.adminId,
      verifiedAdmin1: adminUser.adminId,
      verifiedAt1: new Date(),
      verifiedAdmin2: admin2User.adminId,
      verifiedAt2: new Date(),
      publishedAt: new Date(),
      totalAmount: 25000.00,
      totalDriverShare: 7500.00,
      totalCompanyShare: 17500.00
    }
  });

  const res = await request('/api/v1/invoices?status=PUBLISHED', {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.invoices));
  // Must include PUBLISHED
  assert.ok(res.data.invoices.some((inv) => inv.invoice_id === publishedInvoice.invoiceId));
  // Must NOT include DRAFT
  assert.ok(!res.data.invoices.some((inv) => inv.invoice_id === draftInvoice.invoiceId));

  // Partner directly accessing DRAFT invoice gets 404 NOT_FOUND
  const resDraft = await request(`/api/v1/invoices/${draftInvoice.invoiceId}`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  assert.equal(resDraft.status, 404);

  // Partner directly accessing PUBLISHED invoice gets 200 OK
  const resPub = await request(`/api/v1/invoices/${publishedInvoice.invoiceId}`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  assert.equal(resPub.status, 200);
  assert.equal(resPub.data.status, 'PUBLISHED');
});

// Clean up
test('Teardown test server and db connections', async () => {
  await stopServer();
  await prisma.$disconnect();
});
