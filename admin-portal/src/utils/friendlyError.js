/**
 * friendlyError.js
 * Centralized User-Friendly Error Formatting Utility.
 *
 * Rules:
 * - NEVER show raw errors, stack traces, exception names, HTTP status codes,
 *   error codes (e.g., PRD-xxx, ERR_xxx), request IDs, or raw JSON to users.
 * - If login session is invalid, prompt: "Please log in again to continue."
 * - Log technical error details strictly to developer console.
 * - Return concise, human-friendly sentences explaining what happened and next step.
 */

const TECHNICAL_PATTERNS = [
  /PRD-\w+/i,
  /SQLSTATE/i,
  /prisma/i,
  /syntax error/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ERR_\w+/i,
  /status code \d+/i,
  /status \d+/i,
  /Internal Server Error/i,
  /Cannot read propert/i,
  /undefined is not/i,
  /null is not/i,
  /ReferenceError/i,
  /TypeError/i,
  /NetworkError/i,
  /Failed to fetch/i,
  /UnhandledPromiseRejection/i,
  /\[object Object\]/i,
  /^[A-Z0-9_]{3,}$/, // All-caps technical codes like VALIDATION_ERROR
];

/**
 * Checks if an error message string contains technical jargon.
 */
function isTechnicalMessage(msg) {
  if (!msg || typeof msg !== 'string') return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Extracts and translates any error into a friendly, clear user message.
 *
 * @param {any} error - Thrown error, response object, string, or unknown
 * @param {string} [defaultMessage] - Context-specific fallback message
 * @returns {string} Human-friendly error sentence
 */
export function getFriendlyError(error, defaultMessage = 'Something went wrong. Please try again.') {
  // Always log full diagnostic detail for developers in console
  if (error) {
    console.error('[Developer Diagnostic Error]:', error);
  }

  if (!error) {
    return defaultMessage;
  }

  // 1. Offline / Network Connectivity Check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Cannot connect right now. Please check your internet and try again.';
  }

  const status = error.status || error.response?.status || error.statusCode || null;
  const rawMsg =
    typeof error === 'string'
      ? error
      : error.friendlyMessage ||
        error.message ||
        error.response?.data?.message ||
        error.data?.message ||
        '';

  // 2. Authentication / Session Expiry (401 Unauthorized)
  if (
    status === 401 ||
    /jwt|token|unauthorized|session expired|expired session|login expired|inactivity/i.test(rawMsg)
  ) {
    return 'Please log in again to continue.';
  }

  // 3. Permission Denied (403 Forbidden)
  if (status === 403 || /forbidden|permission|access denied|not authorized/i.test(rawMsg)) {
    return 'You do not have permission to do this.';
  }

  // 4. Resource Not Found (404)
  if (status === 404 || /not found|could not find|does not exist/i.test(rawMsg)) {
    return 'We could not find this item. It may have been removed.';
  }

  // 5. Network / Server Unreachable
  if (
    error.isNetworkError ||
    /failed to fetch|network error|econnrefused|unable to connect|connection refused/i.test(rawMsg)
  ) {
    return 'Cannot connect right now. Please check your internet and try again.';
  }

  // 6. Server-side Error (500+)
  if (status && status >= 500) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }

  // 7. Backend Validation / Business Logic Message Check
  if (rawMsg && !isTechnicalMessage(rawMsg)) {
    // If backend sent a clean, polite message without codes, use it
    let clean = rawMsg.trim();
    if (!clean.endsWith('.') && !clean.endsWith('!')) {
      clean += '.';
    }
    return clean;
  }

  // 8. Default fallback
  return defaultMessage;
}

/**
 * Standard friendly message when loading data fails.
 */
export function getFriendlyLoadError(error) {
  return getFriendlyError(error, 'Could not load the data. Please try again.');
}

/**
 * Standard friendly message when saving or updating fails.
 */
export function getFriendlySaveError(error) {
  return getFriendlyError(error, 'Could not save your changes. Please try again.');
}
