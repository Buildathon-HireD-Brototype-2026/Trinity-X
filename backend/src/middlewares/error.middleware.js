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
    return errorResponse(res, 409, 'CONFLICT', 'This already exists.');
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return errorResponse(res, 404, 'NOT_FOUND', "We couldn't find what you're looking for.");
  }

  // Prisma or database connection / execution error
  if (err.name?.includes('Prisma') || (typeof err.code === 'string' && err.code.startsWith('P'))) {
    console.error('[errorHandler] Database error caught:', err);
    return errorResponse(
      res,
      500,
      'DATABASE_ERROR',
      'Something went wrong on our side. Please try again in a moment.',
      []
    );
  }

  // JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'BAD_REQUEST', 'Malformed JSON in request body.');
  }

  // Default internal server error (never leak raw error or stack trace in responses)
  console.error('[errorHandler] Unhandled server error:', err);
  return errorResponse(
    res,
    500,
    'INTERNAL_ERROR',
    'Something went wrong on our side. Please try again in a moment.',
    []
  );
}
