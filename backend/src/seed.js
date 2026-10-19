import prisma from './config/db.js';
import { hashPassword } from './shared/security.js';

export async function seedInitialData() {
  console.log('[seed] Checking initial seed data...');

  // 1. Office
  let office = await prisma.office.findFirst();
  if (!office) {
    office = await prisma.office.create({
      data: {
        officeName: 'Trinity X HQ Kochi',
        officeLocation: 'Infopark, Kakkanad, Kochi, Kerala'
      }
    });
    console.log('[seed] Created initial Office:', office.officeName);
  }

  // 2. Admins
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
    console.log('[seed] Created initial Admin 1:', admin1.emailId);
  }

  const admin2Email = 'admin2@hired.com';
  const existingAdmin2 = await prisma.admin.findFirst({
    where: { emailId: { equals: admin2Email, mode: 'insensitive' } }
  });

  if (!existingAdmin2) {
    const passwordHash = await hashPassword('Admin@12345');
    const admin2 = await prisma.admin.create({
      data: {
        officeId: office.officeId,
        adminName: 'Verification Admin Alex',
        emailId: admin2Email,
        phoneNo: '+919876543211',
        passwordHash,
        status: 'ACTIVE'
      }
    });
    console.log('[seed] Created initial Admin 2 (for 2-person verification):', admin2.emailId);
  }

  // 3. Partner Company
  const partnerEmail = 'seed.partner@apexlogistics.com';
  let company = await prisma.company.findFirst({
    where: { emailId: { equals: partnerEmail, mode: 'insensitive' } }
  });

  if (!company) {
    const passwordHash = await hashPassword('Partner@123');
    company = await prisma.company.create({
      data: {
        name: 'Apex Logistics Ltd.',
        emailId: partnerEmail,
        phoneNo: '+919800000010',
        contactPerson: 'Manoj Pillai',
        address: 'Seaport-Airport Road, Kakkanad, Kochi',
        companyLocation: 'Kochi',
        officeId: office.officeId,
        passwordHash,
        status: 'ACTIVE',
        hiredSplit: 70.00,
        driverSplit: 30.00
      }
    });
    console.log('[seed] Created Partner Company:', company.name);
  }

  // 4. Drivers (Known password: Driver@123)
  const driver1Phone = '+919876543210';
  let driver1 = await prisma.driver.findFirst({
    where: { phoneNo: driver1Phone }
  });

  const driverPasswordHash = await hashPassword('Driver@123');

  if (!driver1) {
    driver1 = await prisma.driver.create({
      data: {
        name: 'Anil Kumar',
        phoneNo: driver1Phone,
        passwordHash: driverPasswordHash,
        status: 'ACTIVE',
        isOnline: true,
        currentLocation: 'Infopark, Kakkanad, Kochi'
      }
    });
    console.log('[seed] Created Driver 1:', driver1.name, driver1.phoneNo);
  } else {
    // Ensure active and password updated
    driver1 = await prisma.driver.update({
      where: { driverId: driver1.driverId },
      data: { status: 'ACTIVE', passwordHash: driverPasswordHash }
    });
  }

  const driver2Phone = '+919876543211';
  let driver2 = await prisma.driver.findFirst({
    where: { phoneNo: driver2Phone }
  });

  if (!driver2) {
    driver2 = await prisma.driver.create({
      data: {
        name: 'Suresh Nair',
        phoneNo: driver2Phone,
        passwordHash: driverPasswordHash,
        status: 'ACTIVE',
        isOnline: false,
        currentLocation: 'Edapally, Kochi'
      }
    });
    console.log('[seed] Created Driver 2:', driver2.name, driver2.phoneNo);
  } else {
    driver2 = await prisma.driver.update({
      where: { driverId: driver2.driverId },
      data: { status: 'ACTIVE', passwordHash: driverPasswordHash }
    });
  }

  // Seed Driver 1 Live Location
  await prisma.driverLocation.upsert({
    where: { driverId: driver1.driverId },
    update: {
      lat: 9.9981,
      lng: 76.3575,
      speed: 0.0,
      heading: 90.0,
      accuracy: 5.0,
      batteryPercent: 88
    },
    create: {
      driverId: driver1.driverId,
      lat: 9.9981,
      lng: 76.3575,
      speed: 0.0,
      heading: 90.0,
      accuracy: 5.0,
      batteryPercent: 88
    }
  });

  // 5. Order & Assigned Trip for Driver 1
  let activeOrder = await prisma.order.findFirst({
    where: {
      companyId: company.companyId,
      pickupSpot: 'Infopark Phase 1, Kakkanad, Kochi'
    }
  });

  if (!activeOrder) {
    const pickupTime = new Date();
    pickupTime.setHours(pickupTime.getHours() + 2);

    activeOrder = await prisma.order.create({
      data: {
        companyId: company.companyId,
        pickupSpot: 'Infopark Phase 1, Kakkanad, Kochi',
        dropoffSpot: 'Cochin International Airport (COK), Nedumbassery',
        pickupTime,
        contactName: 'Deepak Nambiar',
        contactPhone: '+919800000001',
        notes: 'Executive corporate travel. Toyota Innova requested.',
        status: 'ACCEPTED',
        source: 'PORTAL',
        decidedByAdminId: admin1 ? admin1.adminId : undefined,
        decidedAt: new Date()
      }
    });
    console.log('[seed] Created Order #:', activeOrder.orderId);
  }

  let activeTrip = await prisma.trip.findFirst({
    where: { orderId: activeOrder.orderId }
  });

  if (!activeTrip) {
    activeTrip = await prisma.trip.create({
      data: {
        orderId: activeOrder.orderId,
        driverId: driver1.driverId,
        amount: 2500.00,
        otp: '482910',
        otpAttempts: 0,
        expensesConfirmed: false,
        tripStatus: 'ASSIGNED',
        assignedAt: new Date(),
        eta: new Date(Date.now() + 45 * 60 * 1000)
      }
    });
    console.log('[seed] Created Assigned Trip #:', activeTrip.tripId, 'OTP: 482910');
  } else if (activeTrip.tripStatus !== 'ASSIGNED') {
    await prisma.tripPayroll.deleteMany({ where: { tripId: activeTrip.tripId } });
    await prisma.driverWalletTransaction.deleteMany({ where: { tripId: activeTrip.tripId } });
    await prisma.expense.deleteMany({ where: { tripId: activeTrip.tripId } });
    activeTrip = await prisma.trip.update({
      where: { tripId: activeTrip.tripId },
      data: {
        tripStatus: 'ASSIGNED',
        otp: '482910',
        otpAttempts: 0,
        expensesConfirmed: false,
        startedAt: null,
        closedAt: null,
        selfieURL: null
      }
    });
    console.log('[seed] Reset Trip #:', activeTrip.tripId, 'back to ASSIGNED (cleaned payroll/tx)');
  }

  // Seed initial wallet transaction for Driver 1
  const existingTx = await prisma.driverWalletTransaction.findFirst({
    where: { driverId: driver1.driverId }
  });
  if (!existingTx) {
    await prisma.driverWalletTransaction.create({
      data: {
        driverId: driver1.driverId,
        credit: 1250.00,
        note: 'Welcome onboarding performance credit'
      }
    });
    console.log('[seed] Seeded wallet credit for Driver 1');
  }

  console.log('[seed] Initial seed check complete.');
}

// Allow running directly: node src/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  seedInitialData()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[seed] Error seeding:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
