import prisma from '../src/config/db.js';
import { acceptOrder, rejectOrder } from '../src/modules/order/order.service.js';
import { approveFirstAdminInvoice, approveSecondAdminInvoice, dispatchAdminInvoiceEmail } from '../src/modules/invoice/invoice.service.js';
import { sendOrderDecisionEmail, sendInvoiceStatementEmail } from '../src/shared/email.service.js';

async function runNovaProductionEmailTest() {
  console.log('========================================================================');
  console.log('  TESTING REAL EMAIL DISPATCH FOR NOVA ENTERPRISES GLOBAL              ');
  console.log('  Recipient: maryneha2024@gmail.com                                     ');
  console.log('========================================================================\n');

  // 1. Verify Company
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { emailId: { equals: 'maryneha2024@gmail.com', mode: 'insensitive' } },
        { name: { contains: 'Nova', mode: 'insensitive' } }
      ]
    }
  });

  if (!company) {
    throw new Error('Company Nova Enterprises Global (maryneha2024@gmail.com) not found in database.');
  }

  console.log(`[setup] Found company: "${company.name}" (ID: ${company.companyId}) with email: ${company.emailId}`);

  // Ensure Admin 1 and Admin 2 exist
  const admin1 = await prisma.admin.findFirst({ where: { emailId: 'admin1@hired.com' } });
  const admin2 = await prisma.admin.findFirst({ where: { emailId: 'admin2@hired.com' } });
  if (!admin1 || !admin2) {
    throw new Error('Admin 1 or Admin 2 missing in database.');
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 1: ADMIN ACCEPTS ORDER (CONFIRMATION EMAIL)
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SCENARIO 1: Admin Accepts Order -> Dispatches Confirmation Email');
  console.log('------------------------------------------------------------------------');

  // Create fresh RECEIVED order for testing acceptance
  const acceptTestOrder = await prisma.order.create({
    data: {
      companyId: company.companyId,
      pickupSpot: 'Infopark Expressway Gate 1, Kakkanad, Kochi',
      dropoffSpot: 'Cochin International Airport (COK), Terminal 3',
      pickupTime: new Date(Date.now() + 4 * 3600 * 1000), // 4 hours from now
      contactName: 'Neha Mary (Executive Director)',
      contactPhone: '+919876543210',
      notes: 'Priority Airport Transfer. VIP delegation arrival.',
      status: 'RECEIVED',
      source: 'PORTAL'
    }
  });

  console.log(`[order-accept] Created RECEIVED order #${acceptTestOrder.orderId}. Calling acceptOrder()...`);
  const acceptResult = await acceptOrder(
    acceptTestOrder.orderId,
    admin1.adminId,
    { amount: 1850.00, eta: acceptTestOrder.pickupTime, version: acceptTestOrder.version },
    '127.0.0.1'
  );

  console.log(`✓ Order #${acceptTestOrder.orderId} accepted successfully.`);
  console.log(`  Status: ${acceptResult.order.status}`);
  console.log(`  Trip ID: ${acceptResult.trip.trip_id}, Fare: INR ${acceptResult.trip.amount}, OTP: ${acceptResult.trip.otp}`);

  // -------------------------------------------------------------------------
  // TEST SCENARIO 2: ADMIN REJECTS ORDER (DECLINE EMAIL WITH REASON)
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SCENARIO 2: Admin Rejects Order -> Dispatches Rejection Email with Reason');
  console.log('------------------------------------------------------------------------');

  const rejectTestOrder = await prisma.order.create({
    data: {
      companyId: company.companyId,
      pickupSpot: 'Lulu Cyber Park, Infopark Kochi',
      dropoffSpot: 'Vyttila Mobility Hub',
      pickupTime: new Date(Date.now() + 2 * 3600 * 1000),
      contactName: 'Neha Mary',
      contactPhone: '+919876543210',
      notes: 'Express intra-city courier transfer.',
      status: 'RECEIVED',
      source: 'PORTAL'
    }
  });

  console.log(`[order-reject] Created RECEIVED order #${rejectTestOrder.orderId}. Calling rejectOrder()...`);
  const rejectReason = 'No executive sedans available in Kakkanad Infopark zone for the requested time slot. Recommended booking time: 18:00 onwards.';
  const rejectResult = await rejectOrder(
    rejectTestOrder.orderId,
    admin1.adminId,
    { reason: rejectReason, version: rejectTestOrder.version },
    '127.0.0.1'
  );

  console.log(`✓ Order #${rejectTestOrder.orderId} rejected successfully.`);
  console.log(`  Status: ${rejectResult.status}`);
  console.log(`  Rejection Reason: "${rejectResult.reject_reason}"`);

  // -------------------------------------------------------------------------
  // TEST SCENARIO 3: TWO-PERSON VERIFIED INVOICE STATEMENT DISPATCH
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SCENARIO 3: Admin Verifies Invoice & Dispatches Month-End Statement Email');
  console.log('------------------------------------------------------------------------');

  // Clean up any existing test invoice for Nova in period '2026-10' or use fresh period
  const periodMonth = `2026-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  await prisma.invoice.deleteMany({
    where: { companyId: company.companyId, periodMonth }
  });

  // Create a draft invoice for Nova Enterprises Global
  const invoice = await prisma.invoice.create({
    data: {
      companyId: company.companyId,
      periodMonth,
      status: 'DRAFT',
      createdAdmin: admin1.adminId,
      totalAmount: 14250.00,
      totalDriverShare: 11400.00,
      totalCompanyShare: 2850.00
    }
  });

  console.log(`[invoice-flow] Created draft invoice #${invoice.invoiceId} for ${company.name}`);

  // Step 1: 1st Verification by Admin 1
  console.log(`[invoice-flow] Admin 1 (${admin1.adminName}) performing 1st verification sign-off...`);
  const inv1st = await approveFirstAdminInvoice(invoice.invoiceId, admin1, '127.0.0.1');
  console.log(`✓ 1st sign-off recorded. Status: ${inv1st.status}`);

  // Step 2: 2nd Verification by Admin 2
  console.log(`[invoice-flow] Admin 2 (${admin2.adminName}) performing 2nd verification sign-off...`);
  const inv2nd = await approveSecondAdminInvoice(invoice.invoiceId, admin2, '127.0.0.1');
  console.log(`✓ 2nd sign-off recorded. Status: ${inv2nd.status}`);

  // Step 3: Dispatch verified statement email to maryneha2024@gmail.com
  console.log(`[invoice-flow] Dispatching verified statement to: ${company.emailId}...`);
  const dispatchResult = await dispatchAdminInvoiceEmail(
    invoice.invoiceId,
    {
      recipientEmail: company.emailId,
      ccEmails: 'accounts@novaglobal.com, finance@hired.com',
      notes: 'October 2026 monthly fleet mobility settlement. All trips telematics audited by compliance team.',
      senderAdmin: admin1
    },
    '127.0.0.1'
  );

  console.log(`✓ Statement dispatched successfully!`);
  console.log(`  Statement Ref: ${dispatchResult.invoice.id}`);
  console.log(`  Sent To: ${dispatchResult.dispatchReceipt.recipientEmail}`);
  console.log(`  CC: ${dispatchResult.dispatchReceipt.ccEmails}`);
  console.log(`  Message ID: ${dispatchResult.dispatchReceipt.messageId}`);
  if (dispatchResult.dispatchReceipt.previewUrl) {
    console.log(`  Live Ethereal Preview URL: ${dispatchResult.dispatchReceipt.previewUrl}`);
  }
  console.log(`  Attached Files (${dispatchResult.dispatchReceipt.attachments.length}):`);
  dispatchResult.dispatchReceipt.attachments.forEach(att => {
    console.log(`   - ${att.filename} (${att.contentType})`);
  });

  console.log('\n========================================================================');
  console.log('  ALL 3 REAL EMAIL DISPATCH FLOWS VERIFIED SUCCESSFULLY (100%)         ');
  console.log('========================================================================\n');

  await prisma.$disconnect();
}

runNovaProductionEmailTest().catch(async (err) => {
  console.error('\n❌ ERROR IN NOVA EMAIL TEST:', err);
  await prisma.$disconnect();
  process.exit(1);
});
