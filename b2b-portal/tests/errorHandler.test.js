import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFriendlyErrorMessage,
  validateLoginFields,
  isTechnicalMessage,
} from '../src/utils/errorHandler.js';

test('errorHandler: login with wrong email or password returns security-safe message', () => {
  const error401 = { response: { status: 401, data: { message: 'Invalid password' } } };
  const friendly = getFriendlyErrorMessage(error401, 'login');
  assert.equal(friendly, 'Email or password is wrong');
});

test('errorHandler: session expiration on general request returns session expired message', () => {
  const error401 = { response: { status: 401, data: { message: 'Token expired' } } };
  const friendly = getFriendlyErrorMessage(error401, 'orders');
  assert.equal(friendly, 'Your session has expired. Please log in again.');
});

test('errorHandler: account blocked / forbidden returns friendly contact support message', () => {
  const error403 = { response: { status: 403, data: { message: 'Account is inactive' } } };
  const friendly = getFriendlyErrorMessage(error403, 'login');
  assert.equal(friendly, "You don't have access. Please contact support.");

  const perm403 = { response: { status: 403, data: { message: 'Forbidden' } } };
  const permFriendly = getFriendlyErrorMessage(perm403, 'orders');
  assert.equal(permFriendly, "You don't have permission to do this.");
});

test('errorHandler: 404 returns polite not found message', () => {
  const error404 = { response: { status: 404 } };
  const friendly = getFriendlyErrorMessage(error404);
  assert.equal(friendly, "We couldn't find what you're looking for.");
});

test('errorHandler: 409 conflict returns duplicate data message', () => {
  const error409 = { response: { status: 409, data: { message: 'Unique constraint violated' } } };
  const friendly = getFriendlyErrorMessage(error409);
  assert.equal(friendly, 'This already exists.');

  const email409 = { response: { status: 409, data: { message: 'Email already in use' } } };
  const emailFriendly = getFriendlyErrorMessage(email409);
  assert.equal(emailFriendly, 'This email is already registered. Try logging in.');
});

test('errorHandler: 500 server error never leaks SQL or internal details', () => {
  const error500 = {
    response: {
      status: 500,
      data: { message: 'PrismaClientKnownRequestError: select * from "orders" failed' },
    },
  };
  const friendly = getFriendlyErrorMessage(error500);
  assert.equal(friendly, 'Something went wrong on our side. Please try again in a moment.');
  assert.equal(friendly.includes('500'), false);
  assert.equal(friendly.includes('select'), false);
  assert.equal(friendly.includes('Prisma'), false);
});

test('errorHandler: network failure or server unreachable returns clear connectivity message', () => {
  const networkErr = new Error('Network Error');
  networkErr.code = 'ERR_NETWORK';
  const friendly = getFriendlyErrorMessage(networkErr);
  assert.equal(friendly, "Can't connect right now. Please check your internet and try again.");
  assert.equal(friendly.includes('Network Error'), false);
});

test('errorHandler: slow request or timeout returns polite retry message', () => {
  const timeoutErr = new Error('timeout of 10000ms exceeded');
  timeoutErr.code = 'ECONNABORTED';
  const friendly = getFriendlyErrorMessage(timeoutErr);
  assert.equal(friendly, 'This is taking too long. Please try again.');
});

test('errorHandler: isTechnicalMessage detects SQL, stack traces, and status codes', () => {
  assert.equal(isTechnicalMessage('Request failed with status code 500'), true);
  assert.equal(isTechnicalMessage('SELECT * FROM users WHERE id = 1'), true);
  assert.equal(isTechnicalMessage('at Object.run (/server.js:45:12)'), true);
  assert.equal(isTechnicalMessage('Prisma Client error: foreign key'), true);
  assert.equal(isTechnicalMessage('Pickup location is required'), false);
  assert.equal(isTechnicalMessage('Email or password is wrong'), false);
});

test('errorHandler: validateLoginFields strictly enforces empty and format rules', () => {
  // Empty email
  const emptyEmail = validateLoginFields('', 'Secret@123');
  assert.equal(emptyEmail.isValid, false);
  assert.equal(emptyEmail.error, 'Please enter your email and password');

  // Empty password
  const emptyPass = validateLoginFields('admin@example.com', '');
  assert.equal(emptyPass.isValid, false);
  assert.equal(emptyPass.error, 'Please enter your email and password');

  // Both empty
  const bothEmpty = validateLoginFields('   ', '  ');
  assert.equal(bothEmpty.isValid, false);
  assert.equal(bothEmpty.error, 'Please enter your email and password');

  // Invalid email format
  const badFormat = validateLoginFields('not-an-email', 'Secret@123');
  assert.equal(badFormat.isValid, false);
  assert.equal(badFormat.error, 'Please enter a valid email address');

  // Valid inputs
  const valid = validateLoginFields('partner@company.com', 'Secret@123');
  assert.equal(valid.isValid, true);
  assert.equal(valid.error, '');
});
