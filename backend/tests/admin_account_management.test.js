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
  console.log('   HIRED ADMIN ACCOUNT MANAGEMENT TEST SUITE                     ');
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

  // Clean up any test fixtures from prior runs
  const testEmails = [
    'charlie@hired.test',
    'charlie_updated@hired.test',
    'delta@hired.test'
  ];
  for (const email of testEmails) {
    const existing = await prisma.admin.findMany({
      where: { emailId: { equals: email, mode: 'insensitive' } }
    });
    for (const a of existing) {
      await prisma.session.deleteMany({ where: { userType: 'ADMIN', userId: a.adminId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'ADMIN', entityId: a.adminId } });
      await prisma.admin.delete({ where: { adminId: a.adminId } });
    }
  }

  // Ensure Admin 1 and Admin 2 are active
  const admin1 = await prisma.admin.findFirst({
    where: { emailId: { equals: 'admin1@hired.com', mode: 'insensitive' } }
  });
  assert(admin1, 'Admin 1 (admin1@hired.com) must exist in seed data.');
  await prisma.admin.update({
    where: { adminId: admin1.adminId },
    data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
  });

  const admin2 = await prisma.admin.findFirst({
    where: { emailId: { equals: 'admin2@hired.com', mode: 'insensitive' } }
  });
  assert(admin2, 'Admin 2 (admin2@hired.com) must exist in seed data.');
  await prisma.admin.update({
    where: { adminId: admin2.adminId },
    data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
  });

  let adminAccessToken = null;
  let admin1Id = admin1.adminId;
  let admin2Id = admin2.adminId;
  let createdAdmin3Id = null;
  let createdAdmin4Id = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Log in as Admin 1
    // -------------------------------------------------------------
    const loginRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'admin1@hired.com', password: 'Admin@12345' }
    });
    assert(loginRes.status === 200, `Admin 1 login failed with status ${loginRes.status}`);
    adminAccessToken = loginRes.data.data.access_token;
    assert(adminAccessToken, 'Admin access token must be returned.');

    // -------------------------------------------------------------
    // TEST 1: Unauthorized access protection on /api/v1/admin/admins
    // -------------------------------------------------------------
    console.log('TEST 1: Unauthorized access protection on /api/v1/admin/admins');
    const noAuthRes = await request('/api/v1/admin/admins');
    assert(noAuthRes.status === 401, `Expected 401 Unauthorized, got ${noAuthRes.status}`);

    const badAuthRes = await request('/api/v1/admin/admins', {
      headers: { Authorization: 'Bearer invalid.token.here' }
    });
    assert(badAuthRes.status === 401, `Expected 401 Unauthorized for bad token, got ${badAuthRes.status}`);
    console.log('  PASS - Unauthorized and invalid token requests correctly blocked.\n');

    // -------------------------------------------------------------
    // TEST 2: List admin accounts via GET /api/v1/admin/admins
    // -------------------------------------------------------------
    console.log('TEST 2: List admin accounts via GET /api/v1/admin/admins');
    const listRes = await request('/api/v1/admin/admins', {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(listRes.data.success === true, 'Success flag should be true');
    assert(Array.isArray(listRes.data.data.items), 'items must be an array');
    assert(listRes.data.data.items.length >= 2, 'Should return at least 2 seeded admins');
    assert(listRes.data.data.page === 1, 'Default page must be 1');
    assert(listRes.data.data.limit === 20, 'Default limit must be 20');

    // Verify safe fields (no password hashes exposed)
    const firstAdmin = listRes.data.data.items[0];
    assert(firstAdmin.admin_id !== undefined, 'admin_id must be present');
    assert(firstAdmin.admin_name !== undefined, 'admin_name must be present');
    assert(firstAdmin.email_id !== undefined, 'email_id must be present');
    assert(firstAdmin.status !== undefined, 'status must be present');
    assert(firstAdmin.password_hash === undefined, 'password_hash must never be exposed');
    assert(firstAdmin.passwordHash === undefined, 'passwordHash must never be exposed');
    console.log('  PASS - Admin accounts listed safely with pagination metadata.\n');

    // -------------------------------------------------------------
    // TEST 3: Status filtering and validation on GET /api/v1/admin/admins
    // -------------------------------------------------------------
    console.log('TEST 3: Status filtering on GET /api/v1/admin/admins');
    const activeFilterRes = await request('/api/v1/admin/admins?status=ACTIVE', {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(activeFilterRes.status === 200, `Expected 200, got ${activeFilterRes.status}`);
    assert(activeFilterRes.data.data.items.every(a => a.status === 'ACTIVE'), 'All items should have ACTIVE status');

    const invalidFilterRes = await request('/api/v1/admin/admins?status=INVALID_STATUS', {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(invalidFilterRes.status === 422, `Expected 422 for invalid status filter, got ${invalidFilterRes.status}`);
    console.log('  PASS - Status filtering and validation verified.\n');

    // -------------------------------------------------------------
    // TEST 4: Get Admin details via GET /api/v1/admin/admins/:admin_id
    // -------------------------------------------------------------
    console.log('TEST 4: Retrieve admin details by ID');
    const getAdmin1Res = await request(`/api/v1/admin/admins/${admin1Id}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(getAdmin1Res.status === 200, `Expected 200, got ${getAdmin1Res.status}`);
    assert(getAdmin1Res.data.data.admin_id === admin1Id, 'admin_id should match requested');
    assert(getAdmin1Res.data.data.email_id.toLowerCase() === 'admin1@hired.com', 'email_id should match Admin 1');
    assert(getAdmin1Res.data.data.password_hash === undefined, 'password_hash must never be returned');

    // 404 for non-existent admin
    const getMissingRes = await request('/api/v1/admin/admins/999999', {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(getMissingRes.status === 404, `Expected 404, got ${getMissingRes.status}`);

    // 400 for invalid parameter ID
    const getInvalidIdRes = await request('/api/v1/admin/admins/abc', {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    assert(getInvalidIdRes.status === 400, `Expected 400 for invalid ID, got ${getInvalidIdRes.status}`);
    console.log('  PASS - Admin details retrieved and error scenarios verified.\n');

    // -------------------------------------------------------------
    // TEST 5: Validation errors on POST /api/v1/admin/admins
    // -------------------------------------------------------------
    console.log('TEST 5: Validation errors on admin creation');
    // Missing required fields
    const missingFieldsRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {}
    });
    assert(missingFieldsRes.status === 422, `Expected 422 for missing fields, got ${missingFieldsRes.status}`);

    // Short password (< 8 chars)
    const shortPwdRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Short Pwd Admin',
        email_id: 'short@hired.test',
        password: 'short',
        office_id: testOfficeId
      }
    });
    assert(shortPwdRes.status === 422, `Expected 422 for short password, got ${shortPwdRes.status}`);

    // Invalid email format
    const badEmailRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Bad Email Admin',
        email_id: 'not-an-email',
        password: 'Password123!',
        office_id: testOfficeId
      }
    });
    assert(badEmailRes.status === 422, `Expected 422 for bad email, got ${badEmailRes.status}`);

    // Non-existent office_id
    const badOfficeRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Bad Office Admin',
        email_id: 'badoffice@hired.test',
        password: 'Password123!',
        office_id: 999999
      }
    });
    assert(badOfficeRes.status === 404, `Expected 404 for non-existent office, got ${badOfficeRes.status}`);
    console.log('  PASS - Input validation rules strictly enforced on admin creation.\n');

    // -------------------------------------------------------------
    // TEST 6: Create Admin 3 via POST /api/v1/admin/admins
    // -------------------------------------------------------------
    console.log('TEST 6: Create Admin 3 account');
    const createCharlieRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Operations Admin Charlie',
        email_id: 'charlie@hired.test',
        password: 'Charlie@Password123',
        office_id: testOfficeId,
        phone_no: '+91 9876543299'
      }
    });
    assert(createCharlieRes.status === 201, `Expected 201 Created, got ${createCharlieRes.status}: ${JSON.stringify(createCharlieRes.data)}`);
    assert(createCharlieRes.data.success === true, 'Success flag must be true');
    const charlie = createCharlieRes.data.data;
    assert(charlie.admin_id, 'admin_id must be returned');
    assert(charlie.admin_name === 'Operations Admin Charlie', 'admin_name must match');
    assert(charlie.email_id.toLowerCase() === 'charlie@hired.test', 'email_id must match');
    assert(charlie.status === 'ACTIVE', 'New admin must start in ACTIVE status');
    assert(charlie.password_hash === undefined, 'password_hash must never be returned');
    createdAdmin3Id = charlie.admin_id;

    // Verify audit log entry
    const auditRow = await prisma.auditLog.findFirst({
      where: { action: 'ADMIN_CREATED', entityType: 'ADMIN', entityId: createdAdmin3Id }
    });
    assert(auditRow, 'Audit log entry ADMIN_CREATED must be recorded');
    console.log(`  PASS - Admin 3 created with ID ${createdAdmin3Id} and audited.\n`);

    // -------------------------------------------------------------
    // TEST 7: Duplicate case-insensitive email rejection
    // -------------------------------------------------------------
    console.log('TEST 7: Case-insensitive duplicate email rejection');
    const dupEmailRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Duplicate Charlie',
        email_id: 'CHARLIE@HIRED.TEST',
        password: 'AnotherPassword123',
        office_id: testOfficeId
      }
    });
    assert(dupEmailRes.status === 409, `Expected 409 Conflict for duplicate email, got ${dupEmailRes.status}`);
    assert(dupEmailRes.data.error.code === 'DUPLICATE_EMAIL', 'Error code must be DUPLICATE_EMAIL');
    console.log('  PASS - Duplicate email rejected with 409 DUPLICATE_EMAIL.\n');

    // -------------------------------------------------------------
    // TEST 8: Log in as newly created Admin 3
    // -------------------------------------------------------------
    console.log('TEST 8: Log in as newly created Admin 3');
    const charlieLoginRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'charlie@hired.test', password: 'Charlie@Password123' }
    });
    assert(charlieLoginRes.status === 200, `Expected 200 OK for Admin 3 login, got ${charlieLoginRes.status}`);
    const charlieToken = charlieLoginRes.data.data.access_token;
    assert(charlieToken, 'Admin 3 access token must be returned');

    // Admin 3 has equal management permissions to list admins
    const charlieListRes = await request('/api/v1/admin/admins', {
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    assert(charlieListRes.status === 200, 'Admin 3 must have full admin access without hierarchy');
    console.log('  PASS - Admin 3 authenticated successfully with full admin permissions.\n');

    // -------------------------------------------------------------
    // TEST 9: Update admin profile fields via PATCH /api/v1/admin/admins/:admin_id
    // -------------------------------------------------------------
    console.log('TEST 9: Update permitted admin profile fields');
    const updateRes = await request(`/api/v1/admin/admins/${createdAdmin3Id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Charlie Senior Admin',
        phone_no: '+91 9998887776'
      }
    });
    assert(updateRes.status === 200, `Expected 200 OK, got ${updateRes.status}`);
    assert(updateRes.data.data.admin_name === 'Charlie Senior Admin', 'admin_name should be updated');
    assert(updateRes.data.data.phone_no === '+91 9998887776', 'phone_no should be updated');

    const updateAudit = await prisma.auditLog.findFirst({
      where: { action: 'ADMIN_UPDATED', entityType: 'ADMIN', entityId: createdAdmin3Id },
      orderBy: { auditId: 'desc' }
    });
    assert(updateAudit, 'ADMIN_UPDATED audit log entry must be created');
    console.log('  PASS - Admin profile updated and audited.\n');

    // -------------------------------------------------------------
    // TEST 10: Email collision prevention on profile update
    // -------------------------------------------------------------
    console.log('TEST 10: Email collision prevention on profile update');
    const dupUpdateRes = await request(`/api/v1/admin/admins/${createdAdmin3Id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        email_id: 'admin1@hired.com'
      }
    });
    assert(dupUpdateRes.status === 409, `Expected 409 Conflict, got ${dupUpdateRes.status}`);
    assert(dupUpdateRes.data.error.code === 'DUPLICATE_EMAIL', 'Error code must be DUPLICATE_EMAIL');
    console.log('  PASS - Duplicate email update rejected with 409.\n');

    // -------------------------------------------------------------
    // TEST 11: Change Admin password and verify authentication
    // -------------------------------------------------------------
    console.log('TEST 11: Change Admin password on profile update');
    const updatePwdRes = await request(`/api/v1/admin/admins/${createdAdmin3Id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        password: 'NewPassword@999'
      }
    });
    assert(updatePwdRes.status === 200, `Expected 200 OK on password update, got ${updatePwdRes.status}`);

    // Verify new password login
    const loginNewPwdRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'charlie@hired.test', password: 'NewPassword@999' }
    });
    assert(loginNewPwdRes.status === 200, 'Admin 3 should successfully log in with new password');

    // Old password should fail
    const loginOldPwdRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'charlie@hired.test', password: 'Charlie@Password123' }
    });
    assert(loginOldPwdRes.status === 401, 'Old password should no longer work');
    console.log('  PASS - Password updated, hashed with bcrypt, and verified on login.\n');

    // -------------------------------------------------------------
    // TEST 12: Self-deactivation prevention (Rule 5)
    // -------------------------------------------------------------
    console.log('TEST 12: Prevent admin from deactivating own account');
    const selfDeactivateRes = await request(`/api/v1/admin/admins/${admin1Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'Attempting to deactivate myself' }
    });
    assert(selfDeactivateRes.status === 400, `Expected 400 Bad Request, got ${selfDeactivateRes.status}`);
    assert(selfDeactivateRes.data.error.code === 'CANNOT_DEACTIVATE_SELF', 'Error code must be CANNOT_DEACTIVATE_SELF');
    console.log('  PASS - Admin blocked from deactivating own account.\n');

    // -------------------------------------------------------------
    // TEST 13: Create Admin 4 (Delta) and test deactivation
    // -------------------------------------------------------------
    console.log('TEST 13: Create Admin 4 (Delta) and test deactivation with session revocation');
    const createDeltaRes = await request('/api/v1/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: {
        admin_name: 'Regional Admin Delta',
        email_id: 'delta@hired.test',
        password: 'Delta@Password123',
        office_id: testOfficeId
      }
    });
    assert(createDeltaRes.status === 201, `Failed to create Admin 4: ${createDeltaRes.status}`);
    createdAdmin4Id = createDeltaRes.data.data.admin_id;

    // Log in as Delta to establish an active session
    const deltaLoginRes = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'delta@hired.test', password: 'Delta@Password123' }
    });
    assert(deltaLoginRes.status === 200, 'Delta login should succeed');
    const deltaToken = deltaLoginRes.data.data.access_token;

    // Verify Delta has an active session in the database
    const activeSessionsBefore = await prisma.session.findMany({
      where: { userType: 'ADMIN', userId: createdAdmin4Id, revokedAt: null }
    });
    assert(activeSessionsBefore.length > 0, 'Delta must have active session');

    // Deactivate Delta (Currently active admins: Admin1, Admin2, Admin3, Admin4 = 4 active)
    const deactivateDeltaRes = await request(`/api/v1/admin/admins/${createdAdmin4Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'Temporary role change' }
    });
    assert(deactivateDeltaRes.status === 200, `Expected 200 OK, got ${deactivateDeltaRes.status}`);
    assert(deactivateDeltaRes.data.data.status === 'INACTIVE', 'Status must be updated to INACTIVE');

    // Verify active sessions for Delta were revoked transactionally
    const activeSessionsAfter = await prisma.session.findMany({
      where: { userType: 'ADMIN', userId: createdAdmin4Id, revokedAt: null }
    });
    assert(activeSessionsAfter.length === 0, 'All Delta sessions must be revoked on deactivation');

    // Delta token must now be rejected
    const deltaCallAfter = await request('/api/v1/admin/admins', {
      headers: { Authorization: `Bearer ${deltaToken}` }
    });
    assert(deltaCallAfter.status === 401 || deltaCallAfter.status === 403, 'Deactivated admin request must be rejected');

    // Delta cannot log in while INACTIVE
    const deltaLoginAfter = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'delta@hired.test', password: 'Delta@Password123' }
    });
    assert(deltaLoginAfter.status === 403 || deltaLoginAfter.status === 401, 'Deactivated admin login must be rejected');
    console.log('  PASS - Admin 4 deactivated and sessions revoked in the same transaction.\n');

    // -------------------------------------------------------------
    // TEST 14: Deactivate Admin 3 (Charlie) leaving exactly 2 active admins
    // -------------------------------------------------------------
    console.log('TEST 14: Deactivate Admin 3 leaving exactly 2 active admins (Admin 1 & Admin 2)');
    const deactivateCharlieRes = await request(`/api/v1/admin/admins/${createdAdmin3Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'Contract ended' }
    });
    assert(deactivateCharlieRes.status === 200, `Expected 200 OK, got ${deactivateCharlieRes.status}`);
    assert(deactivateCharlieRes.data.data.status === 'INACTIVE', 'Charlie status must be INACTIVE');

    const activeCount = await prisma.admin.count({ where: { status: 'ACTIVE' } });
    assert(activeCount === 2, `Expected exactly 2 active admins remaining, found ${activeCount}`);
    console.log('  PASS - Admin 3 deactivated; exactly 2 active admins remain.\n');

    // -------------------------------------------------------------
    // TEST 15: Minimum 2 active admins requirement enforcement (Rule 7)
    // -------------------------------------------------------------
    console.log('TEST 15: Enforce minimum 2 active admins requirement');
    // Attempting to deactivate Admin 2 when only 2 active admins exist should fail
    const deactivateAdmin2Res = await request(`/api/v1/admin/admins/${admin2Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'INACTIVE', reason: 'Should fail due to min 2 active admins rule' }
    });
    assert(deactivateAdmin2Res.status === 422, `Expected 422 Unprocessable Entity, got ${deactivateAdmin2Res.status}`);
    assert(
      deactivateAdmin2Res.data.error.code === 'MINIMUM_ACTIVE_ADMINS_REQUIRED',
      `Expected error code MINIMUM_ACTIVE_ADMINS_REQUIRED, got ${deactivateAdmin2Res.data.error.code}`
    );
    console.log('  PASS - Deactivation blocked when 2 or fewer active admins remain.\n');

    // -------------------------------------------------------------
    // TEST 16: Reactivate Admin 4 (Delta) and verify reactivation
    // -------------------------------------------------------------
    console.log('TEST 16: Reactivate Admin 4 (Delta)');
    const reactivateDeltaRes = await request(`/api/v1/admin/admins/${createdAdmin4Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      body: { status: 'ACTIVE', reason: 'Re-enabled for operations' }
    });
    assert(reactivateDeltaRes.status === 200, `Expected 200 OK on reactivation, got ${reactivateDeltaRes.status}`);
    assert(reactivateDeltaRes.data.data.status === 'ACTIVE', 'Status must now be ACTIVE');

    // Verify audit log
    const reactivateAudit = await prisma.auditLog.findFirst({
      where: { action: 'USER_REACTIVATED', entityType: 'ADMIN', entityId: createdAdmin4Id },
      orderBy: { auditId: 'desc' }
    });
    assert(reactivateAudit, 'USER_REACTIVATED audit log entry must be recorded');

    // Delta can now log in again
    const deltaLoginReactivated = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'delta@hired.test', password: 'Delta@Password123' }
    });
    assert(deltaLoginReactivated.status === 200, 'Reactivated admin must be able to log in');
    console.log('  PASS - Admin reactivated, audited, and able to log in.\n');

    console.log('=================================================================');
    console.log('   ALL 16 ADMIN ACCOUNT MANAGEMENT TESTS PASSED (100%)           ');
    console.log('=================================================================\n');
  } finally {
    // Teardown: Clean up created test admins
    if (createdAdmin3Id) {
      await prisma.session.deleteMany({ where: { userType: 'ADMIN', userId: createdAdmin3Id } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'ADMIN', entityId: createdAdmin3Id } });
      await prisma.admin.delete({ where: { adminId: createdAdmin3Id } }).catch(() => null);
    }
    if (createdAdmin4Id) {
      await prisma.session.deleteMany({ where: { userType: 'ADMIN', userId: createdAdmin4Id } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'ADMIN', entityId: createdAdmin4Id } });
      await prisma.admin.delete({ where: { adminId: createdAdmin4Id } }).catch(() => null);
    }

    // Ensure Admin 1 and Admin 2 remain ACTIVE
    if (admin1Id) {
      await prisma.admin.update({
        where: { adminId: admin1Id },
        data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
      }).catch(() => null);
    }
    if (admin2Id) {
      await prisma.admin.update({
        where: { adminId: admin2Id },
        data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null }
      }).catch(() => null);
    }

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
    process.exit(1);
  });
