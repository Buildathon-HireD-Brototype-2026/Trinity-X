import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from './response.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFileName(name = 'file') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Storage Adapter supporting 'local' (default) and 'cloudinary'
 */
class StorageAdapter {
  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 'local';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

    if (this.driver === 'local') {
      this.ensureDir(this.uploadDir);
      this.ensureDir(path.join(this.uploadDir, 'documents'));
      this.ensureDir(path.join(this.uploadDir, 'profiles'));
      this.ensureDir(path.join(this.uploadDir, 'selfies'));
    }
  }

  ensureDir(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (err) {
      console.error(`[storage] Failed to ensure directory ${dirPath}:`, err.message);
    }
  }

  validateFile(file) {
    if (!file) {
      throw new AppError(422, 'VALIDATION_ERROR', 'File is required.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(422, 'VALIDATION_ERROR', 'File size exceeds maximum limit of 5 MB.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(422, 'VALIDATION_ERROR', 'File type not allowed. Only JPG, PNG, and PDF files are permitted.');
    }
  }

  /**
   * Save a file buffer to storage.
   * Returns { fileUrl, key, driver, size, mimeType }
   */
  async saveFile({ buffer, originalname, mimetype, folder = 'documents' }) {
    this.validateFile({ buffer, originalname, mimetype, size: buffer?.length || 0 });

    if (this.driver === 'cloudinary') {
      return this.saveToCloudinary({ buffer, originalname, mimetype, folder });
    }

    return this.saveToLocal({ buffer, originalname, mimetype, folder });
  }

  /**
   * Save to local disk
   */
  async saveToLocal({ buffer, originalname, mimetype, folder }) {
    const targetFolder = path.join(this.uploadDir, folder);
    this.ensureDir(targetFolder);

    const safeName = sanitizeFileName(originalname);
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const filename = `${uniqueSuffix}_${safeName}`;
    const absolutePath = path.join(targetFolder, filename);

    await fs.promises.writeFile(absolutePath, buffer);

    // Relative storage key (e.g., uploads/documents/...)
    const relativeKey = path.relative(process.cwd(), absolutePath);

    return {
      fileUrl: relativeKey,
      absolutePath,
      key: filename,
      folder,
      size: buffer.length,
      mimeType: mimetype,
      driver: 'local'
    };
  }

  /**
   * Upload to Cloudinary via REST API without requiring external SDK
   */
  async saveToCloudinary({ buffer, originalname, mimetype, folder }) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('[storage] Cloudinary credentials missing, falling back to local storage.');
      return this.saveToLocal({ buffer, originalname, mimetype, folder });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const safeName = sanitizeFileName(originalname);
    const publicId = `${folder}/${Date.now()}_${safeName.split('.')[0]}`;

    // Cloudinary signature: folder, public_id, timestamp
    const signatureStr = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimetype });
    formData.append('file', blob, originalname);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('public_id', publicId);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[storage] Cloudinary upload failed:', errText);
      throw new AppError(500, 'STORAGE_ERROR', 'Failed to upload file to cloud storage.');
    }

    const data = await response.json();
    return {
      fileUrl: data.secure_url,
      key: data.public_id,
      folder,
      size: data.bytes || buffer.length,
      mimeType: mimetype,
      driver: 'cloudinary'
    };
  }

  /**
   * Retrieve file content from local storage or cloud
   */
  async getFile(fileUrlOrKey) {
    if (!fileUrlOrKey) return null;

    // Check if it's an HTTP URL (Cloudinary)
    if (fileUrlOrKey.startsWith('http://') || fileUrlOrKey.startsWith('https://')) {
      const response = await fetch(fileUrlOrKey);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // Local file path
    const fullPath = path.isAbsolute(fileUrlOrKey)
      ? fileUrlOrKey
      : path.join(process.cwd(), fileUrlOrKey);

    if (fs.existsSync(fullPath)) {
      return fs.promises.readFile(fullPath);
    }

    return null;
  }
}

export const storage = new StorageAdapter();
export default storage;
