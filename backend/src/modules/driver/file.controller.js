import prisma from '../../config/db.js';
import { verifySignedFileToken } from '../../shared/security.js';
import { errorResponse } from '../../shared/response.js';
import storage from '../../shared/storage.js';

/**
 * Handle signed document download link.
 * GET /api/v1/files/signed?token=...
 * Validates token signature and 5-minute expiry.
 */
export async function downloadSignedFileHandler(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Missing signed access token.');
    }

    let decoded;
    try {
      decoded = verifySignedFileToken(token);
    } catch (err) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Signed document link has expired or is invalid.');
    }

    const { driverId, documentId } = decoded;

    const doc = await prisma.driverDocument.findFirst({
      where: {
        documentId: Number(documentId),
        driverId: Number(driverId)
      }
    });

    if (!doc) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Document not found.');
    }

    // Read real file using storage adapter
    const fileBuffer = await storage.getFile(doc.fileURL);

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName || 'document'}"`);

    if (fileBuffer) {
      res.setHeader('Content-Length', fileBuffer.length);
      return res.status(200).send(fileBuffer);
    }

    // Fallback for seeded or simulated records
    const sampleContent = Buffer.from(`%PDF-1.4 Mock verification document content for ${doc.documentType} (ID: ${doc.documentId})`);
    res.setHeader('Content-Length', sampleContent.length);
    return res.status(200).send(sampleContent);
  } catch (err) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve signed document.');
  }
}
