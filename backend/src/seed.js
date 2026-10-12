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
  const existingAdmin1 = await prisma.admin.findFirst({
    where: { emailId: { equals: admin1Email, mode: 'insensitive' } }
  });

  if (!existingAdmin1) {
    const passwordHash = await hashPassword('Admin@12345');
    const admin1 = await prisma.admin.create({
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
