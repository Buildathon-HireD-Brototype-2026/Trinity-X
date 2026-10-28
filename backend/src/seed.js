import 'dotenv/config';
import prisma from './config/db.js';
import { hashPassword } from './shared/security.js';

function generateSixDigitOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function seedInitialData() {
  console.log('[seed] Checking initial seed data...');

  // 1. Office (Trinity X HQ Kochi)
  let office = await prisma.office.findFirst({
    where: { officeName: 'Trinity X HQ Kochi' }
  });
  if (!office) {
    office = await prisma.office.create({
      data: {
        officeName: 'Trinity X HQ Kochi',
        officeLocation: 'Infopark, Kakkanad, Kochi, Kerala'
      }
    });
    console.log('[seed] Created Office:', office.officeName);
  }

  // 2. Baseline Admins
  const admin1Email = 'admin1@hired.com';
  let admin1 = await prisma.admin.findFirst({
    where: { emailId: { equals: admin1Email, mode: 'insensitive' } }
  });
  if (!admin1) {
    const passwordHash = await hashPassword('Admin@12345');
    admin1 = await prisma.admin.create({
      data: {
        officeId: office.officeId,
        adminName: 'Lead Admin Savio',
        emailId: admin1Email,
        phoneNo: '+919876543210',
        passwordHash,
        status: 'ACTIVE'
      }
    });
    console.log('[seed] Created Admin 1:', admin1.emailId);
  }

  const admin2Email = 'admin2@hired.com';
  let admin2 = await prisma.admin.findFirst({
    where: { emailId: { equals: admin2Email, mode: 'insensitive' } }
  });
  if (!admin2) {
    const passwordHash = await hashPassword('Admin@12345');
    admin2 = await prisma.admin.create({
      data: {
        officeId: office.officeId,
        adminName: 'Verification Admin Alex',
        emailId: admin2Email,
        phoneNo: '+919876543211',
        passwordHash,
        status: 'ACTIVE'
      }
    });
    console.log('[seed] Created Admin 2:', admin2.emailId);
  }

  // 3. Exactly ONE Company: Kerala Test Travels Pvt Ltd
  const companyEmail = 'test-company@example.com';
  let company = await prisma.company.findFirst({
    where: { emailId: { equals: companyEmail, mode: 'insensitive' } }
  });
  if (!company) {
    const passwordHash = await hashPassword('Partner@123');
    company = await prisma.company.create({
      data: {
        name: 'Kerala Test Travels Pvt Ltd',
        emailId: companyEmail,
        phoneNo: '+919000000000',
        contactPerson: 'Operations Desk',
        address: 'MG Road, Kochi, Kerala',
        companyLocation: 'Kochi',
        officeId: office.officeId,
        passwordHash,
        status: 'ACTIVE',
        hiredSplit: 70.00,
        driverSplit: 30.00
      }
    });
    console.log('[seed] Created Company:', company.name, 'ID:', company.companyId);
  }

  // 4. Drivers
  const driver1Password = process.env.SEED_DRIVER1_PASSWORD;
  const driver2Password = process.env.SEED_DRIVER2_PASSWORD;
  if (!driver1Password || !driver1Password.trim()) {
    throw new Error('SEED_DRIVER1_PASSWORD is missing or empty in backend/.env');
  }
  if (!driver2Password || !driver2Password.trim()) {
    throw new Error('SEED_DRIVER2_PASSWORD is missing or empty in backend/.env');
  }

  const driver2Pickup = process.env.SEED_DRIVER2_PICKUP;
  const driver2LatStr = process.env.SEED_DRIVER2_LAT;
  const driver2LngStr = process.env.SEED_DRIVER2_LNG;
  if (!driver2Pickup || !driver2Pickup.trim() || !driver2LatStr || !driver2LngStr) {
    throw new Error('SEED_DRIVER2_PICKUP, SEED_DRIVER2_LAT, or SEED_DRIVER2_LNG is missing or empty in backend/.env');
  }
  const driver2Lat = parseFloat(driver2LatStr);
  const driver2Lng = parseFloat(driver2LngStr);
  if (isNaN(driver2Lat) || isNaN(driver2Lng)) {
    throw new Error('SEED_DRIVER2_LAT and SEED_DRIVER2_LNG must be valid floating point coordinates');
  }

  // Driver 1: Arjun Menon
  const driver1Phone = '+919000000001';
  let driver1 = await prisma.driver.findFirst({
    where: { phoneNo: driver1Phone }
  });
  if (!driver1) {
    const passwordHash = await hashPassword(driver1Password);
    driver1 = await prisma.driver.create({
      data: {
        name: 'Arjun Menon',
        phoneNo: driver1Phone,
        passwordHash,
        status: 'ACTIVE',
        isOnline: false,
        currentLocation: 'Thiruvananthapuram, Kerala'
      }
    });
    console.log('[seed] Created Driver 1:', driver1.name, 'ID:', driver1.driverId);
  }

  // Driver 2: Rahul Pillai
  const driver2Phone = '+919000000002';
  let driver2 = await prisma.driver.findFirst({
    where: { phoneNo: driver2Phone }
  });
  if (!driver2) {
    const passwordHash = await hashPassword(driver2Password);
    driver2 = await prisma.driver.create({
      data: {
        name: 'Rahul Pillai',
        phoneNo: driver2Phone,
        passwordHash,
        status: 'ACTIVE',
        isOnline: true,
        currentLocation: driver2Pickup
      }
    });
    console.log('[seed] Created Driver 2:', driver2.name, 'ID:', driver2.driverId);
  }

  // 5. Driver 1: One ASSIGNED Order & Trip (TRV Airport -> Varkala)
  let order1 = await prisma.order.findFirst({
    where: {
      companyId: company.companyId,
      pickupSpot: 'Thiruvananthapuram International Airport (TRV), Thiruvananthapuram'
    }
  });

  let trip1Otp = null;
  if (!order1) {
    // Tomorrow at 10:00 AM IST
    const tomorrow10am = new Date();
    tomorrow10am.setDate(tomorrow10am.getDate() + 1);
    tomorrow10am.setHours(10, 0, 0, 0);

    order1 = await prisma.order.create({
      data: {
        companyId: company.companyId,
        pickupSpot: 'Thiruvananthapuram International Airport (TRV), Thiruvananthapuram',
        dropoffSpot: 'Varkala, Kerala',
        pickupTime: tomorrow10am,
        contactName: 'Operations Desk',
        contactPhone: '+919000000000',
        status: 'ACCEPTED',
        source: 'PORTAL',
        decidedByAdminId: admin1.adminId,
        decidedAt: new Date()
      }
    });

    trip1Otp = generateSixDigitOtp();
    const trip1 = await prisma.trip.create({
      data: {
        orderId: order1.orderId,
        driverId: driver1.driverId,
        amount: 2500.00,
        otp: trip1Otp,
        otpAttempts: 0,
        expensesConfirmed: false,
        tripStatus: 'ASSIGNED',
        assignedAt: new Date(),
        eta: new Date(order1.pickupTime.getTime() + 60 * 60 * 1000)
      }
    });
    console.log('[seed] Created ASSIGNED Trip 1 for Driver 1 (Trip ID:', trip1.tripId, ')');
  }

  // 6. Driver 2: One ONGOING Order & Trip (Current Location -> Kollam, Kerala)
  let order2 = await prisma.order.findFirst({
    where: {
      companyId: company.companyId,
      dropoffSpot: 'Kollam, Kerala'
    }
  });

  let trip2Otp = null;
  if (!order2) {
    const pickupNow = new Date();
    order2 = await prisma.order.create({
      data: {
        companyId: company.companyId,
        pickupSpot: driver2Pickup,
        dropoffSpot: 'Kollam, Kerala',
        pickupTime: pickupNow,
        contactName: 'Operations Desk',
        contactPhone: '+919000000000',
        status: 'ACCEPTED',
        source: 'PORTAL',
        decidedByAdminId: admin1.adminId,
        decidedAt: new Date()
      }
    });

    trip2Otp = generateSixDigitOtp();
    const trip2 = await prisma.trip.create({
      data: {
        orderId: order2.orderId,
        driverId: driver2.driverId,
        amount: 1500.00,
        otp: trip2Otp,
        otpAttempts: 0,
        expensesConfirmed: false,
        tripStatus: 'ONGOING',
        assignedAt: new Date(Date.now() - 30 * 60 * 1000),
        startedAt: new Date(),
        eta: new Date(Date.now() + 50 * 60 * 1000)
      }
    });
    console.log('[seed] Created ONGOING Trip 2 for Driver 2 (Trip ID:', trip2.tripId, ')');

    // Create live GPS row in driver_locations for Driver 2
    await prisma.driverLocation.upsert({
      where: { driverId: driver2.driverId },
      update: {
        lat: driver2Lat,
        lng: driver2Lng,
        speed: 0.0,
        heading: 0.0,
        accuracy: 4.0,
        batteryPercent: 95,
        tripId: trip2.tripId
      },
      create: {
        driverId: driver2.driverId,
        lat: driver2Lat,
        lng: driver2Lng,
        speed: 0.0,
        heading: 0.0,
        accuracy: 4.0,
        batteryPercent: 95,
        tripId: trip2.tripId
      }
    });
    console.log('[seed] Created driver_locations row for Driver 2 at:', driver2Lat, driver2Lng);
  }

  console.log('[seed] Seed completed successfully.');
  if (trip1Otp || trip2Otp) {
    console.log('====================================================');
    console.log('   GENERATED OTPs FOR TESTING TRIP CLOSURES (TERMINAL ONLY):');
    if (trip1Otp) console.log('   Driver 1 (ASSIGNED Trip): OTP = ' + trip1Otp);
    if (trip2Otp) console.log('   Driver 2 (ONGOING Trip):  OTP = ' + trip2Otp);
    console.log('====================================================');
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedInitialData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('[seed] Error:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
