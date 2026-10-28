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
  console.log('   HIRED ADMIN INVOICE VERIFICATION & DISPATCH BACKEND TESTS     ');
  console.log('=================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[test-runner] Ephemeral test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // Setup test admins & company
    const passwordHash = await hashPassword('Admin@12345');
    
    // Ensure Office
    let office = await prisma.office.findFirst();
    if (!office) {
      office = await prisma.office.create({
        data: { officeName: 'Test Office HQ', officeLocation: 'Bangalore' }
      });
    }

    // Ensure Admin 1 (Lead Admin)
    let admin1 = await prisma.admin.findFirst({ where: { emailId: 'admin1@hired.com' } });
    if (!admin1) {
      admin1 = await prisma.admin.create({
        data: {
          officeId: office.officeId,
          adminName: 'Lead Admin Savio',
          emailId: 'admin1@hired.com',
          phoneNo: '+919876543201',
          passwordHash,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.admin.update({
        where: { adminId: admin1.adminId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, status: 'ACTIVE' }
      });
    }

    // Ensure Admin 2 (Verification Admin)
    let admin2 = await prisma.admin.findFirst({ where: { emailId: 'admin2@hired.com' } });
    if (!admin2) {
      admin2 = await prisma.admin.create({
        data: {
          officeId: office.officeId,
          adminName: 'Verification Admin Alex',
          emailId: 'admin2@hired.com',
          phoneNo: '+919876543202',
          passwordHash,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.admin.update({
        where: { adminId: admin2.adminId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, status: 'ACTIVE' }
      });
    }

    // Ensure Company
    let company = await prisma.company.findFirst({ where: { emailId: 'partner@apexlogistics.com' } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Apex Logistics Ltd',
          emailId: 'partner@apexlogistics.com',
          phoneNo: '+919111122222',
          contactPerson: 'Karan Mehra',
          address: 'Cyber City, Gurugram',
          companyLocation: 'Gurugram',
          officeId: office.officeId,
          passwordHash,
          status: 'ACTIVE',
          hiredSplit: 70.0,
          driverSplit: 30.0
        }
      });
    }

    // Log in Admin 1
    const login1 = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'admin1@hired.com', password: 'Admin@12345' }
    });
    assert(login1.status === 200, `Admin 1 login failed with status ${login1.status}: ${JSON.stringify(login1.data)}`);
    const token1 = login1.data.data?.access_token || login1.data?.access_token;

    // Log in Admin 2
    const login2 = await request('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email_id: 'admin2@hired.com', password: 'Admin@12345' }
    });
    assert(login2.status === 200, `Admin 2 login failed with status ${login2.status}: ${JSON.stringify(login2.data)}`);
    const token2 = login2.data.data?.access_token || login2.data?.access_token;

    // Clean up any test invoice for period 2026-07
    await prisma.invoice.deleteMany({
      where: { companyId: company.companyId, periodMonth: '2026-07' }
    });

    // Create fresh test invoice for verification test cycle
    const testInvoice = await prisma.invoice.create({
      data: {
        companyId: company.companyId,
        periodMonth: '2026-07',
        status: 'DRAFT',
        createdAdmin: admin1.adminId,
        totalAmount: 48500.0,
        totalCompanyShare: 4850.0,
        totalDriverShare: 43650.0
      }
    });
    const invId = testInvoice.invoiceId;
    console.log(`[setup] Created test invoice ID: ${invId}`);

    // TEST 1: Unauthorized access blocked (401)
    console.log('TEST 1: Unauthorized request to /api/v1/admin/invoices blocked');
    const unauth = await request('/api/v1/admin/invoices');
    assert(unauth.status === 401, `Expected 401, got ${unauth.status}`);
    console.log('  PASS - Bearer token requirement strictly enforced.');

    // TEST 2: List invoices with metrics
    console.log('\nTEST 2: List invoices via GET /api/v1/admin/invoices');
    const listRes = await request('/api/v1/admin/invoices', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(Array.isArray(listRes.data.invoices), 'Invoices list is not an array');
    assert(listRes.data.metrics != null, 'Metrics object is missing');
    assert(typeof listRes.data.metrics.pendingCount === 'number', 'pendingCount missing');
    assert(typeof listRes.data.metrics.verifiedCount === 'number', 'verifiedCount missing');
    assert(typeof listRes.data.metrics.sentCount === 'number', 'sentCount missing');
    console.log(`  PASS - Invoices returned with metrics (pending: ${listRes.data.metrics.pendingCount}, verified: ${listRes.data.metrics.verifiedCount}).`);

    // TEST 3: Retrieve single invoice detail
    console.log(`\nTEST 3: Retrieve invoice detail via GET /api/v1/admin/invoices/${invId}`);
    const getRes = await request(`/api/v1/admin/invoices/${invId}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assert(getRes.data.invoice.rawId === invId, 'Raw invoice ID mismatch');
    assert(getRes.data.invoice.status === 'PENDING_APPROVAL_1', `Expected PENDING_APPROVAL_1, got ${getRes.data.invoice.status}`);
    console.log('  PASS - Invoice details retrieved successfully.');

    // TEST 4: First approval by Admin 1
    console.log(`\nTEST 4: Record 1st approval via POST /api/v1/admin/invoices/${invId}/verify-first`);
    const app1Res = await request(`/api/v1/admin/invoices/${invId}/verify-first`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(app1Res.status === 200, `Expected 200, got ${app1Res.status}`);
    assert(app1Res.data.invoice.firstApproval != null, 'First approval was not recorded');
    assert(app1Res.data.invoice.firstApproval.id === String(admin1.adminId), 'First approval admin ID mismatch');
    assert(app1Res.data.invoice.status === 'PENDING_APPROVAL_2', `Expected PENDING_APPROVAL_2, got ${app1Res.data.invoice.status}`);
    console.log('  PASS - 1st verification sign-off recorded. Status moved to PENDING_APPROVAL_2.');

    // TEST 5: Gatekeeper blocks email dispatch before 2nd approval
    console.log('\nTEST 5: Gatekeeper blocks email dispatch on partial approval statement');
    const blockedDispatch = await request(`/api/v1/admin/invoices/${invId}/dispatch-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { recipientEmail: 'billing@apexlogistics.com' }
    });
    assert(blockedDispatch.status === 400, `Expected 400 Bad Request, got ${blockedDispatch.status}`);
    const blockedMsg = blockedDispatch.data.error?.message || blockedDispatch.data.message || '';
    assert(blockedMsg.includes('Two-person verification is required'), `Gatekeeper message mismatch: ${blockedMsg}`);
    console.log('  PASS - Gatekeeper successfully blocked dispatch of partially approved invoice.');

    // TEST 6: Anti-Self-Approval Enforcement (Admin 1 attempts 2nd approval)
    console.log('\nTEST 6: Anti-self-approval rule blocks Admin 1 from providing 2nd approval');
    const selfApp = await request(`/api/v1/admin/invoices/${invId}/verify-second`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(selfApp.status === 403, `Expected 403 Forbidden, got ${selfApp.status}`);
    const selfMsg = selfApp.data.error?.message || selfApp.data.message || '';
    assert(selfMsg.includes('The same administrator cannot sign both approvals'), `Self approval message mismatch: ${selfMsg}`);
    console.log('  PASS - Same administrator strictly blocked from granting second approval.');

    // TEST 7: Distinct Admin (Admin 2) provides 2nd approval
    console.log('\nTEST 7: Admin 2 signs 2nd approval successfully');
    const app2Res = await request(`/api/v1/admin/invoices/${invId}/verify-second`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(app2Res.status === 200, `Expected 200, got ${app2Res.status}`);
    assert(app2Res.data.invoice.secondApproval != null, 'Second approval missing');
    assert(app2Res.data.invoice.secondApproval.id === String(admin2.adminId), 'Second approval admin ID mismatch');
    assert(app2Res.data.invoice.status === 'VERIFIED', `Expected status VERIFIED, got ${app2Res.data.invoice.status}`);
    console.log('  PASS - 2nd approval verified by distinct admin. Status moved to VERIFIED.');

    // TEST 8: Email Dispatch to Corporate B2B Client with System Attachments
    console.log('\nTEST 8: Email dispatch to corporate billing email');
    const dispatchRes = await request(`/api/v1/admin/invoices/${invId}/dispatch-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        recipientEmail: 'billing@apexlogistics.com',
        ccEmails: 'accounts@apexlogistics.com',
        notes: 'October 2026 month-end verified billing statement.'
      }
    });
    assert(dispatchRes.status === 200, `Expected 200, got ${dispatchRes.status}`);
    assert(dispatchRes.data.invoice.status === 'SENT', `Expected SENT, got ${dispatchRes.data.invoice.status}`);
    assert(dispatchRes.data.dispatchReceipt != null, 'Dispatch receipt missing');
    assert(dispatchRes.data.dispatchReceipt.recipientEmail === 'billing@apexlogistics.com', 'Recipient email mismatch');
    assert(Array.isArray(dispatchRes.data.dispatchReceipt.attachments), 'Attachments missing');
    assert(dispatchRes.data.dispatchReceipt.attachments.length === 2, 'Expected 2 attachments (PDF + CSV)');
    console.log(`  PASS - Email dispatched with 2 verified attachments (${dispatchRes.data.dispatchReceipt.attachments[0].name}, ${dispatchRes.data.dispatchReceipt.attachments[1].name}).`);

    // TEST 9: Audit log verification in PostgreSQL
    console.log('\nTEST 9: Verify audit trail rows created in PostgreSQL audit_logs table');
    const auditEntries = await prisma.auditLog.findMany({
      where: { entityType: 'INVOICE', entityId: invId },
      orderBy: { createdAt: 'asc' }
    });
    assert(auditEntries.length >= 3, `Expected at least 3 audit entries, found ${auditEntries.length}`);
    const actions = auditEntries.map((a) => a.action);
    assert(actions.includes('INVOICE_FIRST_APPROVAL'), 'Missing first approval audit entry');
    assert(actions.includes('INVOICE_SECOND_APPROVAL'), 'Missing second approval audit entry');
    assert(actions.includes('INVOICE_DISPATCHED'), 'Missing dispatch audit entry');
    console.log(`  PASS - PostgreSQL audit trail verified with actions: ${actions.join(', ')}.`);

    console.log('\n=================================================================');
    console.log('   ALL 9 ADMIN INVOICE VERIFICATION & DISPATCH TESTS PASSED (100%)');
    console.log('=================================================================\n');

  } catch (err) {
    console.error('\nTEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
