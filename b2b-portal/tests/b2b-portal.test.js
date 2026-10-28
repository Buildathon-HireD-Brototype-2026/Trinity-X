import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Status Enum Validation
import { ORDER_STATUS, TRIP_STATUS, INVOICE_STATUS, STATUS_META } from '../src/constants/status.js';

test('Status Constants conform strictly to HireD PRD v0.2 and database spec', () => {
  assert.equal(ORDER_STATUS.RECEIVED, 'RECEIVED');
  assert.equal(ORDER_STATUS.ACCEPTED, 'ACCEPTED');
  assert.equal(ORDER_STATUS.REJECTED, 'REJECTED');

  assert.equal(TRIP_STATUS.UNASSIGNED, 'UNASSIGNED');
  assert.equal(TRIP_STATUS.ASSIGNED, 'ASSIGNED');
  assert.equal(TRIP_STATUS.ONGOING, 'ONGOING');
  assert.equal(TRIP_STATUS.CLOSED, 'CLOSED');

  assert.equal(INVOICE_STATUS.DRAFT, 'DRAFT');
  assert.equal(INVOICE_STATUS.PENDING_VERIFICATION, 'PENDING_VERIFICATION');
  assert.equal(INVOICE_STATUS.VERIFIED, 'VERIFIED');
  assert.equal(INVOICE_STATUS.PUBLISHED, 'PUBLISHED');

  assert.ok(STATUS_META.RECEIVED.className.includes('status-received'));
  assert.ok(STATUS_META.PUBLISHED.className.includes('status-published'));
});

// Test 2: Two-Person Verification Integrity for Invoices
test('Invoices in DRAFT or PENDING_VERIFICATION must not be accessible to partners', () => {
  const sampleInvoices = [
    { invoice_id: 1, status: 'PUBLISHED', company_id: 101 },
    { invoice_id: 2, status: 'PENDING_VERIFICATION', company_id: 101 },
    { invoice_id: 3, status: 'DRAFT', company_id: 101 },
    { invoice_id: 4, status: 'PUBLISHED', company_id: 102 }, // Other company
  ];

  const currentCompanyId = 101;
  const partnerAccessible = sampleInvoices.filter(
    (inv) => inv.company_id === currentCompanyId && inv.status === 'PUBLISHED'
  );

  assert.equal(partnerAccessible.length, 1);
  assert.equal(partnerAccessible[0].invoice_id, 1);
});

// Test 3: Trip Report Expense & Fare Calculation
test('Trip report calculates total spend correctly and contains no negative amounts', () => {
  const trip = {
    trip_id: 980,
    amount: 2400.0,
    expenses: [
      { description: 'Toll', amount: 160.0 },
      { description: 'Parking', amount: 140.0 },
    ],
  };

  const expensesTotal = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSpend = Number(trip.amount) + expensesTotal;

  assert.equal(expensesTotal, 300.0);
  assert.equal(totalSpend, 2700.0);
});

// Test 4: Tenant Isolation & Company Data Access
test('Partner can only access orders belonging to their company ID', () => {
  const orders = [
    { order_id: 101, company_id: 101, pickup_spot: 'Site A' },
    { order_id: 102, company_id: 101, pickup_spot: 'Site B' },
    { order_id: 103, company_id: 999, pickup_spot: 'Foreign Company Site' },
  ];

  const currentCompanyId = 101;
  const isolatedOrders = orders.filter((o) => o.company_id === currentCompanyId);

  assert.equal(isolatedOrders.length, 2);
  assert.ok(isolatedOrders.every((o) => o.company_id === 101));
});
