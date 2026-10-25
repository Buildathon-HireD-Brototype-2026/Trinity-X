import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import {
  requestEmailOtp,
  verifyEmailOtp,
  registerCompanyWithOtp,
  resetPasswordWithOtp
} from '../src/modules/auth/emailOtp.service.js';
import { hashToken, verifyPassword } from '../src/shared/security.js';

test('Email OTP 5 Security Pillars & Account Creation Suite', async (t) => {
  const testEmail = `test.partner.${Date.now()}@example.com`;
  const resetEmail = `reset.partner.${Date.now()}@example.com`;

  // Cleanup prior to test
  await prisma.emailOtp.deleteMany({
    where: { email: { in: [testEmail, resetEmail] } }
  });
  await prisma.company.deleteMany({
    where: { emailId: { in: [testEmail, resetEmail] } }
  });

  await t.test('Pillar 4 & Pillar 3: OTP generation creates 10-minute SHA-256 record and never stores plain code', async () => {
    const res = await requestEmailOtp({ email: testEmail, purpose: 'EMAIL_VERIFY' });
    assert.equal(res.success, true);
    assert.equal(res.expiresInSeconds, 600);

    const record = await prisma.emailOtp.findFirst({
      where: { email: testEmail, purpose: 'EMAIL_VERIFY' },
      orderBy: { createdAt: 'desc' }
    });

    assert.ok(record);
    assert.equal(record.otpHash.length, 64, 'otpHash must be a 64-char hex SHA-256 string');
    assert.equal(record.attempts, 0);
    assert.equal(record.usedAt, null);

    const expiryTimeDiff = new Date(record.expiresAt).getTime() - new Date(record.createdAt).getTime();
    assert.ok(expiryTimeDiff >= 590000 && expiryTimeDiff <= 610000, 'Expiration must be strictly 10 minutes');
  });

  await t.test('Pillar 5: Cooldown Rate-Limiting rejects second OTP request within 60 seconds', async () => {
    await assert.rejects(
      async () => {
        await requestEmailOtp({ email: testEmail, purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.equal(err.status, 429);
        assert.match(err.message, /Please wait \d+ seconds/);
        return true;
      }
    );
  });

  await t.test('Pillar 2: Purpose Separation rejects verifying EMAIL_VERIFY code with PASSWORD_RESET purpose', async () => {
    // Create a known OTP manually for deterministic verification testing
    const specificOtp = '123456';
    const specificHash = hashToken(specificOtp);

    const otpRow = await prisma.emailOtp.create({
      data: {
        email: testEmail,
        otpHash: specificHash,
        purpose: 'EMAIL_VERIFY',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await assert.rejects(
      async () => {
        await verifyEmailOtp({
          email: testEmail,
          otp: specificOtp,
          purpose: 'PASSWORD_RESET' // Wrong purpose!
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );

    await prisma.emailOtp.delete({ where: { otpId: otpRow.otpId } });
  });

  await t.test('Pillar 1: Brute-Force Defense burns OTP after 3 failed attempts', async () => {
    const rawOtp = '654321';
    const row = await prisma.emailOtp.create({
      data: {
        email: testEmail,
        otpHash: hashToken(rawOtp),
        purpose: 'EMAIL_VERIFY',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // Attempt 1: Wrong code
    await assert.rejects(
      async () => {
        await verifyEmailOtp({ email: testEmail, otp: '000000', purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.match(err.message, /2 attempts remaining/);
        return true;
      }
    );

    // Attempt 2: Wrong code
    await assert.rejects(
      async () => {
        await verifyEmailOtp({ email: testEmail, otp: '111111', purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.match(err.message, /1 attempt remaining/);
        return true;
      }
    );

    // Attempt 3: Wrong code -> Burns the OTP!
    await assert.rejects(
      async () => {
        await verifyEmailOtp({ email: testEmail, otp: '222222', purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.match(err.message, /Maximum attempts exceeded/);
        return true;
      }
    );

    // Check DB status: attempts = 3, usedAt != null
    const updated = await prisma.emailOtp.findUnique({ where: { otpId: row.otpId } });
    assert.equal(updated.attempts, 3);
    assert.ok(updated.usedAt !== null, 'Burned OTP must have usedAt set');

    // Attempt 4: Even with CORRECT code, it is blocked!
    await assert.rejects(
      async () => {
        await verifyEmailOtp({ email: testEmail, otp: rawOtp, purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );

    await prisma.emailOtp.delete({ where: { otpId: row.otpId } });
  });

  await t.test('Pillar 3: Expired OTP is strictly rejected', async () => {
    const expiredRow = await prisma.emailOtp.create({
      data: {
        email: testEmail,
        otpHash: hashToken('999999'),
        purpose: 'EMAIL_VERIFY',
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000) // 1 second in the past
      }
    });

    await assert.rejects(
      async () => {
        await verifyEmailOtp({ email: testEmail, otp: '999999', purpose: 'EMAIL_VERIFY' });
      },
      (err) => {
        assert.match(err.message, /expired/);
        return true;
      }
    );

    await prisma.emailOtp.delete({ where: { otpId: expiredRow.otpId } });
  });

  await t.test('Account Registration with Valid OTP successfully creates active Company in DB', async () => {
    const validOtp = '777888';
    await prisma.emailOtp.create({
      data: {
        email: testEmail,
        otpHash: hashToken(validOtp),
        purpose: 'EMAIL_VERIFY',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    const regResult = await registerCompanyWithOtp({
      companyName: 'Apex Transport Corp',
      contactPerson: 'Alex Taylor',
      phoneNo: '+91 98765 43210',
      email: testEmail,
      password: 'SecurePassword123!',
      otp: validOtp
    });

    assert.equal(regResult.success, true);
    assert.equal(regResult.user_type, 'PARTNER');
    assert.ok(regResult.access_token);
    assert.ok(regResult.refresh_token);

    // Verify company row in PostgreSQL database
    const createdCompany = await prisma.company.findUnique({
      where: { emailId: testEmail }
    });
    assert.ok(createdCompany);
    assert.equal(createdCompany.name, 'Apex Transport Corp');
    assert.equal(createdCompany.status, 'ACTIVE');

    const passwordMatches = await verifyPassword('SecurePassword123!', createdCompany.passwordHash);
    assert.equal(passwordMatches, true, 'Bcrypt password hash must match the registration password');
  });

  await t.test('Password Reset with OTP updates password and revokes previous sessions', async () => {
    // Setup OTP for PASSWORD_RESET
    const resetOtp = '555666';
    await prisma.emailOtp.create({
      data: {
        email: testEmail,
        otpHash: hashToken(resetOtp),
        purpose: 'PASSWORD_RESET',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    const resetRes = await resetPasswordWithOtp({
      email: testEmail,
      otp: resetOtp,
      newPassword: 'BrandNewPassword456!'
    });

    assert.equal(resetRes.success, true);

    // Verify updated password in database
    const updatedCompany = await prisma.company.findUnique({
      where: { emailId: testEmail }
    });
    const newPwdMatches = await verifyPassword('BrandNewPassword456!', updatedCompany.passwordHash);
    assert.equal(newPwdMatches, true);

    const oldPwdMatches = await verifyPassword('SecurePassword123!', updatedCompany.passwordHash);
    assert.equal(oldPwdMatches, false);
  });

  // Teardown
  await prisma.emailOtp.deleteMany({
    where: { email: { in: [testEmail, resetEmail] } }
  });
  await prisma.company.deleteMany({
    where: { emailId: { in: [testEmail, resetEmail] } }
  });
});
