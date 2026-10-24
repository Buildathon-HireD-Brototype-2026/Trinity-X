import { errorResponse, AppError } from '../shared/response.js';

/**
 * Centralized error handling middleware.
 * Ensures consistent response format and prevents leaking sensitive information.
 */
export function errorHandler(err, req, res, next) {
  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    return errorResponse(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle custom thrown error objects with status/code
  if (err.status || err.statusCode) {
    const statusCode = err.status || err.statusCode;
    const code = err.code || (statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : statusCode === 409 ? 'CONFLICT' : statusCode === 422 ? 'VALIDATION_ERROR' : 'BAD_REQUEST');
    const message = err.message || 'An error occurred processing the request.';
    const details = err.details || [];
    return errorResponse(res, statusCode, code, message, details);
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 422, 'INVALID_FILE', 'File size exceeds maximum allowed limit of 5 MB.');
    }
    return errorResponse(res, 422, 'INVALID_FILE', `Upload error: ${err.message}`);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
    return errorResponse(res, 409, 'CONFLICT', `A record with this ${target} already exists.`);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return errorResponse(res, 404, 'NOT_FOUND', 'Requested resource was not found.');
  }

  // JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'BAD_REQUEST', 'Malformed JSON in request body.');
  }

  // Default internal server error (never leak raw error in production)
  console.error('[errorHandler] Unhandled server error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  return errorResponse(
    res,
    500,
    'INTERNAL_ERROR',
    'Internal server error.',
    isDev ? [{ message: err.message, stack: err.stack }] : []
  );
}
