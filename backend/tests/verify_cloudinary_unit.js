import assert from 'assert';
import {
  isCloudinaryConfigured,
  checkCloudinaryInit,
  uploadSelfie,
  deleteSelfie
} from '../src/services/cloudinary.service.js';

async function run() {
  console.log('--- Testing Cloudinary Service functions ---');

  // Without keys
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  assert.strictEqual(isCloudinaryConfigured(), false);
  try {
    await uploadSelfie(Buffer.from('test'), 123);
    assert.fail('Should throw when unconfigured');
  } catch (err) {
    assert.ok(err.message.includes('Selfie storage is not configured yet. Contact admin.'));
  }

  // Deleting when unconfigured should return false without crashing
  const delRes = await deleteSelfie('trip-selfies/some-id');
  assert.strictEqual(delRes, false);

  console.log('✓ Cloudinary unit checks passed successfully.');
}

run();
