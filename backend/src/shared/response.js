/**
 * Standard API response builders adhering to the HireD OpenAPI Specification:
 * Success: { "success": true, "data": {}, "message": "..." }
 * Error:   { "success": false, "error": { "code": "...", "message": "...", "details": [] } }
 */

export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function successResponse(res, statusCode = 200, data = {}, message = 'OK') {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
}

export function listResponse(res, items = [], page = 1, limit = 20, total = 0, message = 'OK') {
  return res.status(200).json({
    success: true,
    data: {
      items,
      page: Number(page),
      limit: Number(limit),
      total: Number(total)
    },
    message
  });
}

export function errorResponse(res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'Internal server error.', details = []) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}
