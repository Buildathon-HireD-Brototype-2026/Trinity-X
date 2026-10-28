import cloudinary from 'cloudinary';

let isConfigured = false;

/**
 * Check if all required Cloudinary environment variables are present and non-empty.
 */
export function isCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Lazily configure Cloudinary SDK instance.
 * Never throws if keys are missing.
 */
function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    return null;
  }
  if (!isConfigured) {
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true
    });
    isConfigured = true;
  }
  return cloudinary.v2;
}

/**
 * Log initialization status at server startup without throwing.
 */
export function checkCloudinaryInit() {
  if (!isCloudinaryConfigured()) {
    console.warn('[cloudinary] Cloudinary not configured - selfie upload disabled');
  } else {
    console.log('[cloudinary] Cloudinary configured successfully');
  }
}

/**
 * Upload selfie buffer to Cloudinary using upload_stream.
 * Folder: "trip-selfies"
 * Public ID: "trip-<tripId>-<timestamp>"
 * Transformation: max width 800, quality auto
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadSelfie(buffer, tripId) {
  const cld = getCloudinary();
  if (!cld) {
    throw new Error('Selfie storage is not configured yet. Contact admin.');
  }

  const timestamp = Date.now();
  const publicId = `trip-${tripId}-${timestamp}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: 'trip-selfies',
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { width: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('[cloudinary] upload_stream failed:', error);
          return reject(new Error(error.message || 'Failed to upload selfie to Cloudinary.'));
        }
        if (!result) {
          return reject(new Error('Cloudinary returned empty result.'));
        }
        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a selfie image from Cloudinary using publicId.
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
export async function deleteSelfie(publicId) {
  if (!publicId) return false;
  const cld = getCloudinary();
  if (!cld) {
    console.warn('[cloudinary] Cannot delete selfie: Cloudinary not configured.');
    return false;
  }

  try {
    const result = await cld.uploader.destroy(publicId, { resource_type: 'image' });
    const isSuccess = result?.result === 'ok' || result?.result === 'not found';
    if (!isSuccess) {
      console.warn(`[cloudinary] Destroy returned unexpected result for ${publicId}:`, result);
    }
    return isSuccess;
  } catch (error) {
    console.error(`[cloudinary] Failed to delete selfie ${publicId}:`, error.message);
    throw error;
  }
}
