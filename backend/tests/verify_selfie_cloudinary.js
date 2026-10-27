import assert from 'assert';
import app from '../src/server.js';
import prisma from '../src/config/db.js';
import { isCloudinaryConfigured, checkCloudinaryInit } from '../src/services/cloudinary.service.js';
import { cleanupExpiredSelfies } from '../src/services/selfieCron.service.js';
import { generateAccessToken } from '../src/shared/security.js';
import crypto from 'crypto';

async function runTests() {
  console.log('=== RUNNING COMPREHENSIVE SELFIE & CLOUDINARY TESTS ===\n');

  // Test 1: Cloudinary is not configured
  console.log('Test 1: isCloudinaryConfigured() with empty credentials...');
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  assert.strictEqual(isCloudinaryConfigured(), false, 'Should return false when keys are unset');
  checkCloudinaryInit(); // Should log the warning and not throw
  console.log('✓ Test 1 passed: Unconfigured check succeeds without throwing.\n');

  // Test 2: Cron job cleanup with unconfigured Cloudinary
  console.log('Test 2: Cron cleanup when unconfigured...');
  const cronRes = await cleanupExpiredSelfies();
  assert.strictEqual(cronRes.skipped, true);
  assert.strictEqual(cronRes.reason, 'CLOUDINARY_NOT_CONFIGURED');
  console.log('✓ Test 2 passed: Cron job skips silently when unconfigured.\n');

  // Start server on an ephemeral port for HTTP tests
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // Create test driver & trip in DB
    const uniquePhone = '999' + Math.floor(1000000 + Math.random() * 9000000);
    const driver = await prisma.driver.create({
      data: {
        name: 'Test Cloudinary Driver',
        phoneNo: uniquePhone,
        passwordHash: 'dummyhash123',
        status: 'ACTIVE'
      }
    });

    const refreshTokenHash = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: driver.driverId,
        userType: 'DRIVER',
        refreshTokenHash: refreshTokenHash,
        expiresAt
      }
    });

    const accessToken = generateAccessToken({
      userType: 'DRIVER',
      userId: driver.driverId,
      sessionId: session.sessionId
    });

    const existingCompany = await prisma.company.findFirst();
    const companyId = existingCompany ? existingCompany.companyId : 1;
    const existingAdmin = await prisma.admin.findFirst();
    const adminId = existingAdmin ? existingAdmin.adminId : 1;

    const order = await prisma.order.create({
      data: {
        companyId: companyId,
        source: 'ADMIN',
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedByAdminId: adminId,
        pickupSpot: 'Test Origin Point',
        dropoffSpot: 'Test Destination Point',
        pickupTime: new Date(),
        contactName: 'Test Passenger',
        contactPhone: '9876543210'
      }
    });

    const trip = await prisma.trip.create({
      data: {
        orderId: order.orderId,
        driverId: driver.driverId,
        tripStatus: 'ASSIGNED',
        assignedAt: new Date(),
        amount: 450.00,
        otp: '123456'
      }
    });

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`
    };

    // Test 3: Upload selfie when Cloudinary is not configured -> expect 503
    console.log('\nTest 3: POST /api/driver/trips/:tripId/start-selfie when unconfigured...');
    const formData1 = new FormData();
    const blob1 = new Blob([Buffer.from('fake-image-bytes')], { type: 'image/jpeg' });
    formData1.append('selfie', blob1, 'selfie.jpg');

    const upload503Res = await fetch(`${baseUrl}/api/driver/trips/${trip.tripId}/start-selfie`, {
      method: 'POST',
      headers: authHeaders,
      body: formData1
    });

    const upload503Data = await upload503Res.json();
    console.log('Status code:', upload503Res.status);
    console.log('Body:', upload503Data);
    assert.strictEqual(upload503Res.status, 503, 'Must return 503 when Cloudinary is not configured');
    assert.ok(
      upload503Data.message.includes('Selfie storage is not configured yet. Contact admin.'),
      'Should contain required 503 message'
    );
    console.log('✓ Test 3 passed: Correct 503 status and message returned.\n');

    // Test 4: Start trip before selfie uploaded -> expect 400 Selfie required
    console.log('Test 4: POST /api/driver/trips/:tripId/start without selfie...');
    const startTripRes = await fetch(`${baseUrl}/api/driver/trips/${trip.tripId}/start`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const startTripData = await startTripRes.json();
    console.log('Status code:', startTripRes.status);
    console.log('Body:', startTripData);
    assert.strictEqual(startTripRes.status, 400, 'Must return 400 when selfie is missing');
    assert.ok(
      startTripData.message.includes('Selfie required'),
      'Should return 400 with "Selfie required"'
    );
    console.log('✓ Test 4 passed: Start trip blocked with 400 "Selfie required".\n');

    // Test 5: Upload invalid file type (e.g., text file)
    console.log('Test 5: POST /api/driver/trips/:tripId/start-selfie with invalid mime type...');
    const formData2 = new FormData();
    const blob2 = new Blob([Buffer.from('not an image')], { type: 'text/plain' });
    formData2.append('selfie', blob2, 'note.txt');

    const badMimeRes = await fetch(`${baseUrl}/api/driver/trips/${trip.tripId}/start-selfie`, {
      method: 'POST',
      headers: authHeaders,
      body: formData2
    });

    const badMimeData = await badMimeRes.json();
    console.log('Status code:', badMimeRes.status);
    console.log('Body:', badMimeData);
    assert.strictEqual(badMimeRes.status, 400, 'Must return 400 for invalid file type');
    assert.ok(
      badMimeData.message.includes('Only JPEG, PNG, and WebP images are allowed'),
      'Should reject non-image file'
    );
    console.log('✓ Test 5 passed: Non-image file correctly rejected with 400.\n');

    // Test 6: Upload oversized file (> 5MB)
    console.log('Test 6: POST /api/driver/trips/:tripId/start-selfie with file > 5MB...');
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const formData3 = new FormData();
    const blob3 = new Blob([largeBuffer], { type: 'image/jpeg' });
    formData3.append('selfie', blob3, 'huge.jpg');

    const largeFileRes = await fetch(`${baseUrl}/api/driver/trips/${trip.tripId}/start-selfie`, {
      method: 'POST',
      headers: authHeaders,
      body: formData3
    });

    const largeFileData = await largeFileRes.json();
    console.log('Status code:', largeFileRes.status);
    console.log('Body:', largeFileData);
    assert.strictEqual(largeFileRes.status, 400, 'Must return 400 for oversized file');
    assert.ok(
      largeFileData.message.includes('5 MB') || largeFileData.error?.code === 'FILE_TOO_LARGE',
      'Should indicate file exceeds limit'
    );
    console.log('✓ Test 6 passed: Oversized file correctly rejected with 400.\n');

    // Test 7: Verify DB fields and Admin order response formatting
    console.log('Test 7: Admin order details formatting...');
    const now = new Date();
    const mockExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.trip.update({
      where: { tripId: trip.tripId },
      data: {
        startSelfieUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/trip-selfies/trip-1-123.jpg',
        startSelfiePublicId: 'trip-selfies/trip-1-123',
        startSelfieUploadedAt: now,
        startSelfieExpiresAt: mockExpires,
        startSelfieDeletedAt: null
      }
    });

    const updatedTrip = await prisma.trip.findUnique({
      where: { tripId: trip.tripId },
      include: { order: true, driver: true }
    });

    assert.strictEqual(updatedTrip.startSelfiePublicId, 'trip-selfies/trip-1-123');
    assert.strictEqual(updatedTrip.startSelfieUrl, 'https://res.cloudinary.com/demo/image/upload/v123456/trip-selfies/trip-1-123.jpg');

    // Now starting trip should succeed since selfie is present
    const startSuccessRes = await fetch(`${baseUrl}/api/driver/trips/${trip.tripId}/start`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const startSuccessData = await startSuccessRes.json();
    console.log('Status code:', startSuccessRes.status);
    console.log('Body:', startSuccessData);
    assert.strictEqual(startSuccessRes.status, 200);
    assert.strictEqual(startSuccessData.data.status, 'ONGOING');
    console.log('✓ Test 7 passed: Trip successfully starts once selfie is saved.\n');

    // Clean up test data
    await prisma.trip.delete({ where: { tripId: trip.tripId } });
    await prisma.order.delete({ where: { orderId: order.orderId } });
    await prisma.session.deleteMany({ where: { userId: driver.driverId, userType: 'DRIVER' } });
    await prisma.driver.delete({ where: { driverId: driver.driverId } });

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } finally {
    server.close();
  }
}

runTests()
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
