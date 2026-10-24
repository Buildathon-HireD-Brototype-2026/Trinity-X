import { AppError } from '../shared/response.js';

/**
 * Validation middleware factory.
 * Accepts a validator function that takes req and returns an array of { field, message } errors.
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    const details = validatorFn(req);
    if (details && details.length > 0) {
      return next(new AppError(422, 'VALIDATION_ERROR', 'Request validation failed.', details));
    }
    next();
  };
}

/**
 * Helper to validate integer ID in params
 */
export function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1 || String(num) !== String(val)) {
      return next(
        new AppError(400, 'BAD_REQUEST', `Invalid parameter: ${paramName} must be a positive integer.`, [
          { field: paramName, message: 'must be an integer >= 1' }
        ])
      );
    }
    req.params[paramName] = num;
    next();
  };
}

/**
 * Helper to parse pagination params
 */
export function parsePagination(req) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  return { page, limit, skip: (page - 1) * limit };
}
