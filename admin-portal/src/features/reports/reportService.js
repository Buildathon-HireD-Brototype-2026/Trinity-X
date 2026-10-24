/**
 * reportService.js
 * Multi-Domain Enterprise Reporting & Fleet Analytics Engine (PRD A-08, A-11).
 * Supports individual report generation for:
 * 1. Trip Reports (Live / Daily / Monthly)
 * 2. Billing Issues
 * 3. Driver Delay Report
 * 4. Client Order Volume & Success Rate
 * 5. Driver Payout Report
 * 6. Order Report
 * 7. Driver (Staff) Work Report
 *
 * Implements CWE-1236 Formula Injection Defense across all CSV exports.
 */

// ---------------------------------------------------------------------------
// 1. Core Seed Datasets
// ---------------------------------------------------------------------------

export const REPORT_TYPES = [
  { id: 'trips', label: 'Trip Report', icon: 'Car', description: 'Comprehensive trip lifecycle, fares, and route audit.' },
  { id: 'billing_issues', label: 'Billing Issues', icon: 'AlertCircle', description: 'Disputed fares, toll mismatches, and invoice exceptions.' },
  { id: 'driver_delays', label: 'Driver Delay Report', icon: 'Clock', description: 'Pickup punctuality, delay analysis, and SLA tracking.' },
  { id: 'client_volume', label: 'Client Order Volume & SLA', icon: 'Building2', description: 'Corporate account order demand, spend, and success rates.' },
  { id: 'driver_payouts', label: 'Driver Payout Report', icon: 'DollarSign', description: 'Driver earnings, platform commission, and settlement ledger.' },
  { id: 'orders', label: 'Order Report', icon: 'PackageCheck', description: 'Booking demand, lead times, and fulfillment dispatch status.' },
  { id: 'driver_work', label: 'Driver (Staff) Work Report', icon: 'Users', description: 'Shift duty hours, distance traveled, and driver performance scores.' },
];

export const COMPANIES_LIST = [
  { id: '1', name: 'Acme Technologies Pvt Ltd' },
  { id: '2', name: 'Nexus Logistics India' },
  { id: '3', name: 'CloudScale Systems India' },
  { id: '4', name: 'Starlight Financial Services' },
  { id: '5', name: 'BioPharm Solutions' }
];

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
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-21T08:00:00Z'
  },
  {
    tripId: 2005,
    orderId: 1005,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Pooja Hegde',
    passengerPhone: '+91 98334 55667',
    pickupSpot: 'Koramangala 5th Block, Bengaluru',
    dropoffSpot: 'Outer Ring Road, Bellandur EcoSpace',
    pickupTime: '2026-10-21T17:30:00Z',
    vehicleType: 'Hatchback',
    amount: 650.00,
    driverId: 104,
    driverName: 'Suresh Babu',
    driverPhone: '+91 98223 45678',
    vehicleNumber: 'KA-05-GH-3456',
    driverEarning: 520.00,
    platformCommission: 130.00,
    tripStatus: 'IN_TRANSIT',
    createdAt: '2026-10-21T09:00:00Z'
  },
  {
    tripId: 2006,
    orderId: 1006,
    companyId: 5,
    companyName: 'BioPharm Solutions',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Dr. Anand Rao',
    passengerPhone: '+91 98991 22334',
    pickupSpot: 'Jayanagar 4th Block, Bengaluru',
    dropoffSpot: 'Electronic City Biotech Park, Bengaluru',
    pickupTime: '2026-10-21T18:00:00Z',
    vehicleType: 'SUV',
    amount: 1950.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    driverEarning: 1560.00,
    platformCommission: 390.00,
    tripStatus: 'SCHEDULED',
    createdAt: '2026-10-21T09:15:00Z'
  },
  {
    tripId: 2007,
    orderId: 1007,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Kavita Krishnan',
    passengerPhone: '+91 98110 99887',
    pickupSpot: 'BTM Layout 2nd Stage, Bengaluru',
    dropoffSpot: 'Whitefield ITPL Gate 3, Bengaluru',
    pickupTime: '2026-10-21T13:00:00Z',
    vehicleType: 'Sedan',
    amount: 1250.00,
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    driverEarning: 0.00,
    platformCommission: 0.00,
    tripStatus: 'CANCELLED',
    createdAt: '2026-10-21T09:30:00Z'
  },
  {
    tripId: 1995,
    orderId: 995,
    companyId: 3,
    companyName: 'CloudScale Systems India',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Deepak Joshi',
    passengerPhone: '+91 98765 11223',
    pickupSpot: 'Whitefield ITPL Main Gate, Bengaluru',
    dropoffSpot: 'Outer Ring Road, Marathahalli Bridge',
    pickupTime: '2026-10-20T10:30:00Z',
    vehicleType: 'Sedan',
    amount: 950.00,
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    driverEarning: 760.00,
    platformCommission: 190.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-20T08:00:00Z'
  },
  {
    tripId: 1996,
    orderId: 996,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    hiredSplit: 20.00,
    driverSplit: 80.00,
    passengerName: 'Sunita Reddy',
    passengerPhone: '+91 98221 44556',
    pickupSpot: 'Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'Indiranagar 12th Main Road, Bengaluru',
    pickupTime: '2026-10-20T14:00:00Z',
    vehicleType: 'SUV',
    amount: 1350.00,
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    driverEarning: 1080.00,
    platformCommission: 270.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-20T09:30:00Z'
  },
  {
    tripId: 1990,
    orderId: 990,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    hiredSplit: 15.00,
    driverSplit: 85.00,
    passengerName: 'Gaurav Verma',
    passengerPhone: '+91 98554 33221',
    pickupSpot: 'HSR Layout Sector 2, Bengaluru',
    dropoffSpot: 'Electronic City Toll Plaza, Bengaluru',
    pickupTime: '2026-10-19T09:00:00Z',
    vehicleType: 'Sedan',
    amount: 1100.00,
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    driverEarning: 935.00,
    platformCommission: 165.00,
    tripStatus: 'COMPLETED',
    createdAt: '2026-10-19T07:00:00Z'
  },
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
  }
];

// ---------------------------------------------------------------------------
// 2. Billing Issues Dataset
// ---------------------------------------------------------------------------
let _billingIssues = [
  {
    issueId: 'BIL-801',
    tripId: 2001,
    orderId: 1003,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    issueType: 'Toll Mismatch',
    reportedDate: '2026-10-21T16:00:00Z',
    disputedAmount: 180.00,
    originalAmount: 1850.00,
    status: 'UNDER_REVIEW',
    priority: 'HIGH',
    description: 'Elevated toll fee claimed on NICE Road without toll receipt upload.',
    resolutionNotes: 'Awaiting toll gate Fastag log verification with fleet operator.'
  },
  {
    issueId: 'BIL-802',
    tripId: 2002,
    orderId: 1002,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    issueType: 'Waiting Charge Dispute',
    reportedDate: '2026-10-21T17:15:00Z',
    disputedAmount: 250.00,
    originalAmount: 2200.00,
    status: 'RESOLVED',
    priority: 'MEDIUM',
    description: 'Client contested 35-min waiting surcharge; driver confirmed 12 mins only.',
    resolutionNotes: 'Adjusted invoice downwards by ₹150; credit note issued.'
  },
  {
    issueId: 'BIL-803',
    tripId: 2007,
    orderId: 1007,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    issueType: 'Cancellation Penalty Waiver',
    reportedDate: '2026-10-21T14:30:00Z',
    disputedAmount: 300.00,
    originalAmount: 1250.00,
    status: 'PENDING',
    priority: 'HIGH',
    description: 'Driver delayed arrival past SLA; client claims cancellation fee should be waived.',
    resolutionNotes: 'GPS logs confirm driver 22 mins late; recommended full fee waiver.'
  },
  {
    issueId: 'BIL-804',
    tripId: 1996,
    orderId: 996,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    issueType: 'Fare Discrepancy',
    reportedDate: '2026-10-20T16:45:00Z',
    disputedAmount: 220.00,
    originalAmount: 1350.00,
    status: 'RESOLVED',
    priority: 'LOW',
    description: 'Detour via Old Airport Road billed at peak surge rates.',
    resolutionNotes: 'Traffic detour verified and approved; corporate contract rate preserved.'
  },
  {
    issueId: 'BIL-805',
    tripId: 1981,
    orderId: 961,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    issueType: 'Duplicate Invoice Entry',
    reportedDate: '2026-10-08T11:00:00Z',
    disputedAmount: 2500.00,
    originalAmount: 2500.00,
    status: 'RESOLVED',
    priority: 'HIGH',
    description: 'Billing system recorded twin debit vouchers for airport transfer.',
    resolutionNotes: 'Voided duplicate invoice INV-961-B in accounting reconciliation.'
  }
];

// ---------------------------------------------------------------------------
// 3. Driver Delay Dataset
// ---------------------------------------------------------------------------
let _driverDelays = [
  {
    tripId: 2001,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    vehicleType: 'Sedan',
    passengerName: 'Vikram Malhotra',
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    scheduledPickup: '2026-10-21T14:00:00Z',
    actualArrival: '2026-10-21T14:15:00Z',
    delayMinutes: 15,
    delayReason: 'Bellandur ORR Flyover Congestion',
    delaySeverity: 'MODERATE',
    punctualityStatus: 'DELAYED'
  },
  {
    tripId: 2002,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    vehicleType: 'SUV',
    passengerName: 'Shreya Sengupta',
    companyId: 2,
    companyName: 'Nexus Logistics India',
    scheduledPickup: '2026-10-21T15:25:00Z',
    actualArrival: '2026-10-21T15:30:00Z',
    delayMinutes: 5,
    delayReason: 'Metro Construction Detour',
    delaySeverity: 'MINOR',
    punctualityStatus: 'ON_TIME'
  },
  {
    tripId: 2004,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    vehicleType: 'Sedan',
    passengerName: 'Rohan Deshmukh',
    companyId: 3,
    companyName: 'CloudScale Systems India',
    scheduledPickup: '2026-10-21T11:00:00Z',
    actualArrival: '2026-10-21T10:55:00Z',
    delayMinutes: 0,
    delayReason: 'None (Early Arrival)',
    delaySeverity: 'NONE',
    punctualityStatus: 'ON_TIME'
  },
  {
    tripId: 2007,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    vehicleType: 'Sedan',
    passengerName: 'Kavita Krishnan',
    companyId: 2,
    companyName: 'Nexus Logistics India',
    scheduledPickup: '2026-10-21T12:35:00Z',
    actualArrival: '2026-10-21T13:00:00Z',
    delayMinutes: 25,
    delayReason: 'GPS Signal Loss & Fueling Stop',
    delaySeverity: 'CRITICAL',
    punctualityStatus: 'DELAYED'
  },
  {
    tripId: 1996,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    vehicleType: 'SUV',
    passengerName: 'Sunita Reddy',
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    scheduledPickup: '2026-10-20T13:45:00Z',
    actualArrival: '2026-10-20T14:00:00Z',
    delayMinutes: 15,
    delayReason: 'Rain & Waterlogging near Marathahalli',
    delaySeverity: 'MODERATE',
    punctualityStatus: 'DELAYED'
  }
];

// ---------------------------------------------------------------------------
// 4. Client Order Volume & SLA Dataset
// ---------------------------------------------------------------------------
let _clientVolumeData = [
  {
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    contractTier: 'ENTERPRISE_GOLD',
    totalOrders: 142,
    completedTrips: 135,
    cancelledOrders: 7,
    successRate: 95.1,
    totalSpend: 248650.00,
    avgTripFare: 1841.85,
    onTimeRate: 93.8,
    status: 'EXCELLENT'
  },
  {
    companyId: 2,
    companyName: 'Nexus Logistics India',
    contractTier: 'ENTERPRISE_SILVER',
    totalOrders: 118,
    completedTrips: 104,
    cancelledOrders: 14,
    successRate: 88.1,
    totalSpend: 194300.00,
    avgTripFare: 1868.27,
    onTimeRate: 86.5,
    status: 'ATTENTION_NEEDED'
  },
  {
    companyId: 3,
    companyName: 'CloudScale Systems India',
    contractTier: 'ENTERPRISE_PLATINUM',
    totalOrders: 96,
    completedTrips: 94,
    cancelledOrders: 2,
    successRate: 97.9,
    totalSpend: 165400.00,
    avgTripFare: 1759.57,
    onTimeRate: 98.0,
    status: 'EXCELLENT'
  },
  {
    companyId: 4,
    companyName: 'Starlight Financial Services',
    contractTier: 'ENTERPRISE_GOLD',
    totalOrders: 84,
    completedTrips: 79,
    cancelledOrders: 5,
    successRate: 94.0,
    totalSpend: 128900.00,
    avgTripFare: 1631.65,
    onTimeRate: 92.4,
    status: 'GOOD'
  },
  {
    companyId: 5,
    companyName: 'BioPharm Solutions',
    contractTier: 'STANDARD',
    totalOrders: 52,
    completedTrips: 48,
    cancelledOrders: 4,
    successRate: 92.3,
    totalSpend: 86200.00,
    avgTripFare: 1795.83,
    onTimeRate: 90.1,
    status: 'GOOD'
  }
];

// ---------------------------------------------------------------------------
// 5. Driver Payout Dataset
// ---------------------------------------------------------------------------
let _driverPayouts = [
  {
    payoutId: 'PAY-701',
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleNumber: 'KA-01-AB-1234',
    vehicleType: 'Sedan',
    completedTrips: 34,
    grossFare: 48500.00,
    platformFee: 9700.00,
    netPayout: 38800.00,
    payoutStatus: 'PROCESSED',
    payoutCycle: '2026-W42 (Oct 15 - Oct 21)',
    paymentReference: 'UTR-HDFC-992817412',
    disbursedDate: '2026-10-21T18:00:00Z'
  },
  {
    payoutId: 'PAY-702',
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleNumber: 'KA-03-CD-5678',
    vehicleType: 'Sedan',
    completedTrips: 29,
    grossFare: 39800.00,
    platformFee: 7960.00,
    netPayout: 31840.00,
    payoutStatus: 'PROCESSED',
    payoutCycle: '2026-W42 (Oct 15 - Oct 21)',
    paymentReference: 'UTR-ICIC-883719204',
    disbursedDate: '2026-10-21T18:15:00Z'
  },
  {
    payoutId: 'PAY-703',
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleNumber: 'KA-04-EF-9012',
    vehicleType: 'SUV',
    completedTrips: 42,
    grossFare: 64200.00,
    platformFee: 12840.00,
    netPayout: 51360.00,
    payoutStatus: 'PENDING_CLEARANCE',
    payoutCycle: '2026-W42 (Oct 15 - Oct 21)',
    paymentReference: 'PENDING_BATCH_NEFT',
    disbursedDate: 'Scheduled 2026-10-22'
  },
  {
    payoutId: 'PAY-704',
    driverId: 104,
    driverName: 'Suresh Babu',
    driverPhone: '+91 98223 45678',
    vehicleNumber: 'KA-05-GH-3456',
    vehicleType: 'Hatchback',
    completedTrips: 22,
    grossFare: 21500.00,
    platformFee: 4300.00,
    netPayout: 17200.00,
    payoutStatus: 'PROCESSED',
    payoutCycle: '2026-W42 (Oct 15 - Oct 21)',
    paymentReference: 'UTR-SBI-448291048',
    disbursedDate: '2026-10-21T18:30:00Z'
  }
];

// ---------------------------------------------------------------------------
// 6. Order Report Dataset
// ---------------------------------------------------------------------------
let _orderRecords = [
  {
    orderId: 1003,
    companyId: 1,
    companyName: 'Acme Technologies Pvt Ltd',
    passengerName: 'Vikram Malhotra',
    passengerPhone: '+91 98112 55667',
    bookingType: 'SCHEDULED_ADVANCE',
    vehicleClass: 'Sedan',
    vehicleType: 'Sedan',
    assignedDriver: 'Rajesh Kannan',
    pickupSpot: 'Bellandur EcoSpace, Bengaluru',
    dropoffSpot: 'MG Road Metro Station',
    fareQuoted: 1850.00,
    dispatchLeadTime: '4 mins',
    orderStatus: 'FULFILLED',
    createdAt: '2026-10-21T06:00:00Z'
  },
  {
    orderId: 1002,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    passengerName: 'Shreya Sengupta',
    passengerPhone: '+91 98765 22334',
    bookingType: 'IMMEDIATE_DISPATCH',
    vehicleClass: 'SUV',
    vehicleType: 'SUV',
    assignedDriver: 'Anil Kumar Gowda',
    pickupSpot: 'Indiranagar 100ft Rd',
    dropoffSpot: 'Electronic City Toll Plaza',
    fareQuoted: 2200.00,
    dispatchLeadTime: '6 mins',
    orderStatus: 'FULFILLED',
    createdAt: '2026-10-21T07:15:00Z'
  },
  {
    orderId: 1004,
    companyId: 4,
    companyName: 'Starlight Financial Services',
    passengerName: 'Meera Nambiar',
    passengerPhone: '+91 98223 77889',
    bookingType: 'SCHEDULED_ADVANCE',
    vehicleClass: 'Sedan',
    vehicleType: 'Sedan',
    assignedDriver: 'Rajesh Kannan',
    pickupSpot: 'HSR Layout Sector 1',
    dropoffSpot: 'Manyata Embassy Business Park',
    fareQuoted: 1150.00,
    dispatchLeadTime: '5 mins',
    orderStatus: 'FULFILLED',
    createdAt: '2026-10-21T07:30:00Z'
  },
  {
    orderId: 1001,
    companyId: 3,
    companyName: 'CloudScale Systems India',
    passengerName: 'Rohan Deshmukh',
    passengerPhone: '+91 98450 11223',
    bookingType: 'IMMEDIATE_DISPATCH',
    vehicleClass: 'Sedan',
    vehicleType: 'Sedan',
    assignedDriver: 'Mohammed Farooq',
    pickupSpot: 'Whitefield ITPL Main Gate',
    dropoffSpot: 'Airport Terminal 2',
    fareQuoted: 1450.00,
    dispatchLeadTime: '3 mins',
    orderStatus: 'FULFILLED',
    createdAt: '2026-10-21T08:00:00Z'
  },
  {
    orderId: 1007,
    companyId: 2,
    companyName: 'Nexus Logistics India',
    passengerName: 'Kavita Krishnan',
    passengerPhone: '+91 98110 99887',
    bookingType: 'IMMEDIATE_DISPATCH',
    vehicleClass: 'Sedan',
    vehicleType: 'Sedan',
    assignedDriver: 'Unassigned',
    pickupSpot: 'BTM Layout 2nd Stage',
    dropoffSpot: 'Whitefield ITPL Gate 3',
    fareQuoted: 1250.00,
    dispatchLeadTime: '—',
    orderStatus: 'CANCELLED_BY_CLIENT',
    createdAt: '2026-10-21T09:30:00Z'
  }
];

// ---------------------------------------------------------------------------
// 7. Driver (Staff) Work Report Dataset
// ---------------------------------------------------------------------------
let _driverWorkData = [
  {
    driverId: 101,
    driverName: 'Rajesh Kannan',
    driverPhone: '+91 98451 23456',
    vehicleClass: 'Sedan (KA-01-AB-1234)',
    vehicleType: 'Sedan',
    dutyHoursLogged: 46.5,
    totalDistanceKm: 1280,
    tripsCompleted: 34,
    tripsDeclined: 2,
    acceptanceRate: 94.4,
    cancellationRate: 1.2,
    customerRating: 4.92,
    activeShift: 'Day (07:00 - 16:30)',
    performanceTier: 'TOP_PERFORMER'
  },
  {
    driverId: 102,
    driverName: 'Mohammed Farooq',
    driverPhone: '+91 98765 67890',
    vehicleClass: 'Sedan (KA-03-CD-5678)',
    vehicleType: 'Sedan',
    dutyHoursLogged: 42.0,
    totalDistanceKm: 1140,
    tripsCompleted: 29,
    tripsDeclined: 4,
    acceptanceRate: 87.9,
    cancellationRate: 3.1,
    customerRating: 4.85,
    activeShift: 'Evening (14:00 - 23:00)',
    performanceTier: 'CONSISTENT'
  },
  {
    driverId: 103,
    driverName: 'Anil Kumar Gowda',
    driverPhone: '+91 98112 34567',
    vehicleClass: 'SUV (KA-04-EF-9012)',
    vehicleType: 'SUV',
    dutyHoursLogged: 51.0,
    totalDistanceKm: 1690,
    tripsCompleted: 42,
    tripsDeclined: 1,
    acceptanceRate: 97.6,
    cancellationRate: 0.8,
    customerRating: 4.96,
    activeShift: 'Day (06:30 - 17:00)',
    performanceTier: 'TOP_PERFORMER'
  },
  {
    driverId: 104,
    driverName: 'Suresh Babu',
    driverPhone: '+91 98223 45678',
    vehicleClass: 'Hatchback (KA-05-GH-3456)',
    vehicleType: 'Hatchback',
    dutyHoursLogged: 36.5,
    totalDistanceKm: 890,
    tripsCompleted: 22,
    tripsDeclined: 6,
    acceptanceRate: 78.6,
    cancellationRate: 4.5,
    customerRating: 4.74,
    activeShift: 'Flexible (10:00 - 18:00)',
    performanceTier: 'NEEDS_COACHING'
  }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getDateBoundary(preset, customStart, customEnd) {
  const now = new Date('2026-10-21T23:59:59.999Z');
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
    start = new Date('2026-10-21T00:00:00.000Z');
    end = new Date('2026-10-21T23:59:59.999Z');
  } else if (preset === 'last7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
  } else if (preset === 'last30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
  } else if (preset === 'thismonth') {
    start = new Date('2026-10-01T00:00:00.000Z');
    end = new Date('2026-10-31T23:59:59.999Z');
  } else if (preset === 'custom' && customStart && customEnd) {
    start = new Date(`${customStart}T00:00:00.000Z`);
    end = new Date(`${customEnd}T23:59:59.999Z`);
  }

  return { start, end };
}

/**
 * Universal Data Fetcher for All 7 Dedicated Reports
 */
export async function getReportData(reportType = 'trips', options = {}) {
  const {
    tripScope = 'all', // 'all' | 'live' | 'daily' | 'monthly'
    preset = 'last30days',
    startDate,
    endDate,
    companyId = 'ALL',
    vehicleType = 'ALL',
    status = 'ALL',
    search = ''
  } = options;

  await delay(120);

  const { start, end } = getDateBoundary(preset, startDate, endDate);
  const q = search.trim().toLowerCase();

  // Helper to match company by ID or name
  const matchesCompany = (item) => {
    if (companyId === 'ALL') return true;
    if (item.companyId !== undefined) {
      return String(item.companyId) === String(companyId);
    }
    const matched = COMPANIES_LIST.find((c) => String(c.id) === String(companyId));
    if (matched && item.companyName) {
      return item.companyName.toLowerCase() === matched.name.toLowerCase();
    }
    return false;
  };

  // Helper to match vehicle class
  const matchesVehicle = (item) => {
    if (vehicleType === 'ALL') return true;
    const v = item.vehicleType || item.vehicleClass || '';
    return v.toLowerCase().includes(vehicleType.toLowerCase());
  };

  // -------------------------------------------------------------------------
  // 1. TRIP REPORT (Live / Daily / Monthly)
  // -------------------------------------------------------------------------
  if (reportType === 'trips') {
    let filtered = _historicalTrips.filter((trip) => {
      const tripDate = new Date(trip.pickupTime);
      return tripDate >= start && tripDate <= end;
    });

    if (tripScope === 'live') {
      filtered = filtered.filter((t) => t.tripStatus === 'IN_TRANSIT' || t.tripStatus === 'SCHEDULED');
    }

    if (companyId !== 'ALL') {
      filtered = filtered.filter(matchesCompany);
    }
    if (vehicleType !== 'ALL') {
      filtered = filtered.filter(matchesVehicle);
    }
    if (status !== 'ALL') {
      filtered = filtered.filter((t) => t.tripStatus === status);
    }
    if (q) {
      filtered = filtered.filter((t) =>
        `trp-${t.tripId}`.toLowerCase().includes(q) ||
        t.companyName.toLowerCase().includes(q) ||
        t.passengerName.toLowerCase().includes(q) ||
        (t.driverName && t.driverName.toLowerCase().includes(q))
      );
    }

    const completed = filtered.filter((t) => t.tripStatus === 'COMPLETED');
    const gross = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const payouts = completed.reduce((sum, t) => sum + Number(t.driverEarning || 0), 0);
    const margin = completed.reduce((sum, t) => sum + Number(t.platformCommission || 0), 0);

    return {
      reportType: 'trips',
      tripScope,
      metrics: [
        { label: 'Total Trips Tracked', value: filtered.length, sub: `${completed.length} completed`, icon: 'Car' },
        { label: 'Gross Volume (GMV)', value: `₹${gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Fares billed', icon: 'DollarSign' },
        { label: 'Driver Disbursements', value: `₹${payouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Net driver earnings', icon: 'Users' },
        { label: 'Platform Revenue', value: `₹${margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Platform commission', icon: 'TrendingUp' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 2. BILLING ISSUES REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'billing_issues') {
    let filtered = _billingIssues.filter((b) => {
      if (!b.reportedDate) return true;
      const d = new Date(b.reportedDate);
      return d >= start && d <= end;
    });

    if (companyId !== 'ALL') {
      filtered = filtered.filter(matchesCompany);
    }

    if (q) {
      filtered = filtered.filter((b) =>
        b.issueId.toLowerCase().includes(q) ||
        b.companyName.toLowerCase().includes(q) ||
        b.issueType.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    }

    const totalDisputed = filtered.reduce((s, i) => s + Number(i.disputedAmount || 0), 0);
    const resolvedCount = filtered.filter((i) => i.status === 'RESOLVED').length;
    const pendingCount = filtered.filter((i) => i.status !== 'RESOLVED').length;

    return {
      reportType: 'billing_issues',
      metrics: [
        { label: 'Reported Billing Exceptions', value: filtered.length, sub: `${pendingCount} unresolved issues`, icon: 'AlertCircle' },
        { label: 'Disputed Capital', value: `₹${totalDisputed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Flagged amount', icon: 'DollarSign' },
        { label: 'Under Active Review', value: pendingCount, sub: 'Needs operations review', icon: 'Clock' },
        { label: 'Settlement Resolution Rate', value: `${filtered.length > 0 ? ((resolvedCount / filtered.length) * 100).toFixed(0) : 100}%`, sub: `${resolvedCount} resolved`, icon: 'CheckCircle2' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 3. DRIVER DELAY REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'driver_delays') {
    let filtered = _driverDelays.filter((d) => {
      if (!d.scheduledPickup) return true;
      const s = new Date(d.scheduledPickup);
      return s >= start && s <= end;
    });

    if (companyId !== 'ALL') {
      filtered = filtered.filter(matchesCompany);
    }
    if (vehicleType !== 'ALL') {
      filtered = filtered.filter(matchesVehicle);
    }

    if (q) {
      filtered = filtered.filter((d) =>
        d.driverName.toLowerCase().includes(q) ||
        d.passengerName.toLowerCase().includes(q) ||
        d.delayReason.toLowerCase().includes(q)
      );
    }

    const delayedCount = filtered.filter((d) => d.punctualityStatus === 'DELAYED').length;
    const avgDelay = (filtered.reduce((s, d) => s + Number(d.delayMinutes || 0), 0) / (filtered.length || 1)).toFixed(1);
    const onTimeRate = (((filtered.length - delayedCount) / (filtered.length || 1)) * 100).toFixed(1);

    return {
      reportType: 'driver_delays',
      metrics: [
        { label: 'Total Tracked Pickups', value: filtered.length, sub: 'SLA monitored trips', icon: 'Clock' },
        { label: 'Delayed Arrivals (>10m)', value: delayedCount, sub: 'Breached pickup SLA', icon: 'AlertCircle' },
        { label: 'Fleet Punctuality Rate', value: `${onTimeRate}%`, sub: 'On-time arrival SLA', icon: 'TrendingUp' },
        { label: 'Average Pickup Delay', value: `${avgDelay} mins`, sub: 'Across delayed trips', icon: 'Clock' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 4. CLIENT ORDER VOLUME & SLA REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'client_volume') {
    let filtered = [..._clientVolumeData];

    if (companyId !== 'ALL') {
      filtered = filtered.filter(matchesCompany);
    }

    if (q) {
      filtered = filtered.filter((c) => c.companyName.toLowerCase().includes(q));
    }

    const totalOrders = filtered.reduce((s, c) => s + Number(c.totalOrders || 0), 0);
    const totalSpend = filtered.reduce((s, c) => s + Number(c.totalSpend || 0), 0);
    const avgSuccess = (filtered.reduce((s, c) => s + Number(c.successRate || 0), 0) / (filtered.length || 1)).toFixed(1);

    return {
      reportType: 'client_volume',
      metrics: [
        { label: 'Active Corporate Clients', value: filtered.length, sub: 'B2B contracted accounts', icon: 'Building2' },
        { label: 'Total Corporate Bookings', value: totalOrders, sub: 'Dispatched volume', icon: 'Car' },
        { label: 'Overall Fulfillment SLA', value: `${avgSuccess}%`, sub: 'Corporate completion rate', icon: 'CheckCircle2' },
        { label: 'Total Corporate Spend', value: `₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'B2B billed turnover', icon: 'DollarSign' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 5. DRIVER PAYOUT REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'driver_payouts') {
    let filtered = [..._driverPayouts];

    if (vehicleType !== 'ALL') {
      filtered = filtered.filter(matchesVehicle);
    }

    if (q) {
      filtered = filtered.filter((p) => p.driverName.toLowerCase().includes(q) || p.payoutId.toLowerCase().includes(q));
    }

    const totalGross = filtered.reduce((s, p) => s + Number(p.grossFare || 0), 0);
    const totalNet = filtered.reduce((s, p) => s + Number(p.netPayout || 0), 0);
    const totalFee = filtered.reduce((s, p) => s + Number(p.platformFee || 0), 0);

    return {
      reportType: 'driver_payouts',
      metrics: [
        { label: 'Net Driver Disbursements', value: `₹${totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Settled to drivers', icon: 'DollarSign' },
        { label: 'Platform Margin (20%)', value: `₹${totalFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Commission retained', icon: 'TrendingUp' },
        { label: 'Gross Trips Value', value: `₹${totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Total driver fares', icon: 'Car' },
        { label: 'Active Earning Drivers', value: filtered.length, sub: 'Payout recipients', icon: 'Users' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 6. ORDER REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'orders') {
    let filtered = _orderRecords.filter((o) => {
      if (!o.createdAt) return true;
      const c = new Date(o.createdAt);
      return c >= start && c <= end;
    });

    if (companyId !== 'ALL') {
      filtered = filtered.filter(matchesCompany);
    }
    if (vehicleType !== 'ALL') {
      filtered = filtered.filter(matchesVehicle);
    }

    if (q) {
      filtered = filtered.filter((o) =>
        `ord-${o.orderId}`.toLowerCase().includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.passengerName.toLowerCase().includes(q) ||
        o.assignedDriver.toLowerCase().includes(q)
      );
    }

    const fulfilled = filtered.filter((o) => o.orderStatus === 'FULFILLED').length;
    const immediate = filtered.filter((o) => o.bookingType === 'IMMEDIATE_DISPATCH').length;

    return {
      reportType: 'orders',
      metrics: [
        { label: 'Total Ingested Orders', value: filtered.length, sub: 'Corporate booking pool', icon: 'PackageCheck' },
        { label: 'Fulfilled Bookings', value: fulfilled, sub: 'Successfully dispatched', icon: 'CheckCircle2' },
        { label: 'Immediate Dispatches', value: immediate, sub: `${filtered.length - immediate} advance scheduled`, icon: 'Clock' },
        { label: 'Avg Dispatch Turnaround', value: '4.8 mins', sub: 'Driver acceptance speed', icon: 'TrendingUp' }
      ],
      records: filtered
    };
  }

  // -------------------------------------------------------------------------
  // 7. DRIVER (STAFF) WORK REPORT
  // -------------------------------------------------------------------------
  if (reportType === 'driver_work') {
    let filtered = [..._driverWorkData];

    if (vehicleType !== 'ALL') {
      filtered = filtered.filter(matchesVehicle);
    }

    if (q) {
      filtered = filtered.filter((w) => w.driverName.toLowerCase().includes(q) || w.vehicleClass.toLowerCase().includes(q));
    }

    const totalHours = filtered.reduce((s, w) => s + Number(w.dutyHoursLogged || 0), 0);
    const avgRating = (filtered.reduce((s, w) => s + Number(w.customerRating || 0), 0) / (filtered.length || 1)).toFixed(2);
    const avgAcceptance = (filtered.reduce((s, w) => s + Number(w.acceptanceRate || 0), 0) / (filtered.length || 1)).toFixed(1);

    return {
      reportType: 'driver_work',
      metrics: [
        { label: 'Active Working Drivers', value: filtered.length, sub: 'On-duty fleet staff', icon: 'Users' },
        { label: 'Total Duty Hours Logged', value: `${totalHours.toFixed(1)} hrs`, sub: 'Active roster hours', icon: 'Clock' },
        { label: 'Fleet Acceptance Rate', value: `${avgAcceptance}%`, sub: 'Trip assignment pickup', icon: 'TrendingUp' },
        { label: 'Fleet Customer Rating', value: `${avgRating} ★`, sub: 'Passenger satisfaction', icon: 'CheckCircle2' }
      ],
      records: filtered
    };
  }

  return { reportType, metrics: [], records: [] };
}

// ---------------------------------------------------------------------------
// Backward-Compatible Wrapper for Trip Reports
// ---------------------------------------------------------------------------
export async function getTripReports(options = {}) {
  const result = await getReportData('trips', options);
  
  const dailyMap = {};
  result.records.forEach((t) => {
    const dStr = t.pickupTime.split('T')[0];
    if (!dailyMap[dStr]) dailyMap[dStr] = { date: dStr, count: 0, revenue: 0 };
    dailyMap[dStr].count += 1;
    if (t.tripStatus === 'COMPLETED') dailyMap[dStr].revenue += Number(t.amount || 0);
  });
  const dailyVolume = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const companyMap = {};
  result.records.forEach((t) => {
    const cName = t.companyName;
    if (!companyMap[cName]) companyMap[cName] = { companyName: cName, count: 0, spend: 0 };
    companyMap[cName].count += 1;
    if (t.tripStatus === 'COMPLETED') companyMap[cName].spend += Number(t.amount || 0);
  });
  const corporateSpend = Object.values(companyMap).sort((a, b) => b.spend - a.spend);

  const vehicleMap = { Sedan: 0, SUV: 0, Hatchback: 0 };
  result.records.forEach((t) => {
    vehicleMap[t.vehicleType] = (vehicleMap[t.vehicleType] || 0) + 1;
  });
  const vehicleDemand = Object.entries(vehicleMap).map(([type, count]) => ({
    type,
    count,
    percentage: result.records.length > 0 ? Number(((count / result.records.length) * 100).toFixed(1)) : 0
  }));

  const completedTripsList = result.records.filter((t) => t.tripStatus === 'COMPLETED');
  const grossRevenue = completedTripsList.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return {
    metrics: {
      totalTrips: result.records.length,
      completedTrips: completedTripsList.length,
      cancelledTrips: result.records.filter((t) => t.tripStatus === 'CANCELLED').length,
      inTransitTrips: result.records.filter((t) => t.tripStatus === 'IN_TRANSIT').length,
      grossRevenue,
      driverPayouts: completedTripsList.reduce((acc, t) => acc + Number(t.driverEarning || 0), 0),
      platformMargin: completedTripsList.reduce((acc, t) => acc + Number(t.platformCommission || 0), 0),
      completionRate: result.records.length > 0 ? Number(((completedTripsList.length / result.records.length) * 100).toFixed(1)) : 100,
      avgTripFare: completedTripsList.length > 0 ? Number((grossRevenue / completedTripsList.length).toFixed(2)) : 0
    },
    dailyVolume,
    corporateSpend,
    vehicleDemand,
    trips: result.records
  };
}

// ---------------------------------------------------------------------------
// 8. Sanitized CSV Export Engine with CWE-1236 Defense
// ---------------------------------------------------------------------------
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // CWE-1236 Defense: Neutralize dynamic formula triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Universal CSV Exporter Supporting All 7 Report Types
 */
export function exportReportToCsv(reportType = 'trips', records = [], filenamePrefix = 'hired-report') {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No records available to export for the selected filter.');
  }

  let headers = [];
  let rows = [];

  switch (reportType) {
    case 'billing_issues':
      headers = ['Issue ID', 'Trip ID', 'Order ID', 'Corporate Client', 'Issue Category', 'Disputed Amount (INR)', 'Original Amount (INR)', 'Status', 'Priority', 'Description', 'Resolution Notes'];
      rows = records.map((b) => [
        b.issueId,
        `TRP-${b.tripId}`,
        `ORD-${b.orderId}`,
        b.companyName,
        b.issueType,
        Number(b.disputedAmount || 0).toFixed(2),
        Number(b.originalAmount || 0).toFixed(2),
        b.status,
        b.priority,
        b.description,
        b.resolutionNotes
      ]);
      break;

    case 'driver_delays':
      headers = ['Trip ID', 'Driver Name', 'Driver Contact', 'Vehicle Number', 'Passenger', 'Corporate Client', 'Scheduled Pickup', 'Actual Arrival', 'Delay (Mins)', 'Delay Reason', 'Punctuality Status'];
      rows = records.map((d) => [
        `TRP-${d.tripId}`,
        d.driverName,
        d.driverPhone,
        d.vehicleNumber,
        d.passengerName,
        d.companyName,
        d.scheduledPickup,
        d.actualArrival,
        d.delayMinutes,
        d.delayReason,
        d.punctualityStatus
      ]);
      break;

    case 'client_volume':
      headers = ['Company ID', 'Corporate Account', 'Contract Tier', 'Total Bookings', 'Completed Trips', 'Cancelled Orders', 'Success Rate (%)', 'Total Spend (INR)', 'Avg Trip Fare (INR)', 'On-Time Rate (%)', 'Account Health'];
      rows = records.map((c) => [
        `CORP-${c.companyId}`,
        c.companyName,
        c.contractTier,
        c.totalOrders,
        c.completedTrips,
        c.cancelledOrders,
        `${c.successRate}%`,
        Number(c.totalSpend || 0).toFixed(2),
        Number(c.avgTripFare || 0).toFixed(2),
        `${c.onTimeRate}%`,
        c.status
      ]);
      break;

    case 'driver_payouts':
      headers = ['Payout ID', 'Driver ID', 'Driver Name', 'Contact', 'Vehicle Number', 'Vehicle Class', 'Completed Trips', 'Gross Fare (INR)', 'Platform Fee (INR)', 'Net Payout (INR)', 'Payout Status', 'Payment Cycle', 'Bank Reference / UTR'];
      rows = records.map((p) => [
        p.payoutId,
        `DRV-${p.driverId}`,
        p.driverName,
        p.driverPhone,
        p.vehicleNumber,
        p.vehicleType,
        p.completedTrips,
        Number(p.grossFare || 0).toFixed(2),
        Number(p.platformFee || 0).toFixed(2),
        Number(p.netPayout || 0).toFixed(2),
        p.payoutStatus,
        p.payoutCycle,
        p.paymentReference
      ]);
      break;

    case 'orders':
      headers = ['Order ID', 'Corporate Client', 'Passenger Name', 'Passenger Contact', 'Booking Type', 'Vehicle Class', 'Assigned Driver', 'Pickup Destination', 'Dropoff Destination', 'Quoted Fare (INR)', 'Dispatch Lead Time', 'Order Status'];
      rows = records.map((o) => [
        `ORD-${o.orderId}`,
        o.companyName,
        o.passengerName,
        o.passengerPhone,
        o.bookingType,
        o.vehicleClass,
        o.assignedDriver,
        o.pickupSpot,
        o.dropoffSpot,
        Number(o.fareQuoted || 0).toFixed(2),
        o.dispatchLeadTime,
        o.orderStatus
      ]);
      break;

    case 'driver_work':
      headers = ['Driver ID', 'Driver Name', 'Contact', 'Vehicle Class', 'Duty Hours Logged', 'Total Distance (KM)', 'Completed Trips', 'Declined Trips', 'Acceptance Rate (%)', 'Cancellation Rate (%)', 'Customer Rating', 'Shift Schedule', 'Performance Tier'];
      rows = records.map((w) => [
        `DRV-${w.driverId}`,
        w.driverName,
        w.driverPhone,
        w.vehicleClass,
        w.dutyHoursLogged,
        w.totalDistanceKm,
        w.tripsCompleted,
        w.tripsDeclined,
        `${w.acceptanceRate}%`,
        `${w.cancellationRate}%`,
        `${w.customerRating} ★`,
        w.activeShift,
        w.performanceTier
      ]);
      break;

    case 'trips':
    default:
      headers = ['Trip ID', 'Order ID', 'Pickup Date', 'Pickup Time', 'Corporate Client', 'Passenger Name', 'Passenger Contact', 'Driver Name', 'Driver Contact', 'Vehicle Number', 'Vehicle Class', 'Pickup Spot', 'Dropoff Destination', 'Gross Fare (INR)', 'Driver Payout (INR)', 'Platform Commission (INR)', 'Trip Status'];
      rows = records.map((t) => {
        const pickupDateObj = new Date(t.pickupTime);
        return [
          `TRP-${t.tripId}`,
          `ORD-${t.orderId}`,
          pickupDateObj.toISOString().split('T')[0],
          pickupDateObj.toTimeString().split(' ')[0].slice(0, 5),
          t.companyName,
          t.passengerName,
          t.passengerPhone,
          t.driverName || 'Unassigned',
          t.driverPhone || '—',
          t.vehicleNumber || '—',
          t.vehicleType,
          t.pickupSpot,
          t.dropoffSpot,
          Number(t.amount || 0).toFixed(2),
          Number(t.driverEarning || 0).toFixed(2),
          Number(t.platformCommission || 0).toFixed(2),
          t.tripStatus
        ];
      });
      break;
  }

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

export function exportTripsToCsv(trips, filenamePrefix = 'hired-trips-report') {
  return exportReportToCsv('trips', trips, filenamePrefix);
}
