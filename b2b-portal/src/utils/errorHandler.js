/**
 * Central Error Handler Utility
 *
 * Converts any error (API response, network failure, timeout, unexpected crash)
 * into a simple, polite, human-friendly message.
 *
 * Guaranteed Rules:
 * - Never shows raw status codes (401, 404, 500), "Request failed", "Network Error", stack traces, SQL errors, or raw JSON.
 * - Technical details are logged to the browser console for developer inspection.
 */

// Patterns indicating technical/internal details that must NEVER be exposed to users
const TECHNICAL_PATTERNS = [
  /status code/i,
  /request failed/i,
  /network error/i,
  /prisma/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
  /database/i,
  /postgres/i,
  /foreign key/i,
  /unique constraint/i,
  /connection refused/i,
  /econnrefused/i,
  /enotfound/i,
  /stack trace/i,
  /at\s+[\w.<>]+\s+\(/i, // Stack frame
  /select\s+/i,
  /insert\s+into/i,
  /update\s+/i,
  /delete\s+from/i,
  /\{.*"error"/i, // Raw JSON string
];

/**
 * Checks whether a message contains raw technical or database jargon.
 * @param {string} msg
 * @returns {boolean}
 */
export function isTechnicalMessage(msg) {
  if (typeof msg !== 'string') return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Converts any error into a human-friendly message.
 *
 * @param {any} error - The caught error object, response, or string
 * @param {string} [context] - Optional context ('login', 'session', 'create_order', etc.)
 * @returns {string} - Clean, polite user-facing message
 */
export function getFriendlyErrorMessage(error, context = '') {
  // Always log full technical error in browser console for developers
  if (typeof console !== 'undefined' && console.error) {
    console.error('[HireD Developer Log]', error);
  }

  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  // 1. Slow Request / Timeout
  const isTimeout =
    error.code === 'ECONNABORTED' ||
    (typeof error.message === 'string' &&
      (error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('taking too long')));

  if (isTimeout) {
    return 'This is taking too long. Please try again.';
  }

  // 2. Network Failure / Server Unreachable
  const isNetworkFailure =
    !isTimeout &&
    (error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (!error.response && Boolean(error.request)) ||
      (typeof error.message === 'string' &&
        (error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('connect') ||
          error.message.toLowerCase().includes('failed to fetch'))));

  if (isNetworkFailure) {
    return "Can't connect right now. Please check your internet and try again.";
  }

  // Extract HTTP status code from response or error object
  const status = error.response?.status || error.status || error.statusCode;

  // 3. HTTP 401: Unauthorized
  if (status === 401) {
    if (context === 'login') {
      return 'Email or password is wrong';
    }
    return 'Your session has expired. Please log in again.';
  }

  // 4. HTTP 403: Forbidden / Blocked
  if (status === 403) {
    const rawMsg = (error.response?.data?.message || error.message || '').toLowerCase();
    if (context === 'login' || rawMsg.includes('block') || rawMsg.includes('inactive') || rawMsg.includes('access')) {
      return "You don't have access. Please contact support.";
    }
    return "You don't have permission to do this.";
  }

  // 5. HTTP 404: Not Found
  if (status === 404) {
    return "We couldn't find what you're looking for.";
  }

  // 6. HTTP 409: Conflict / Duplicate
  if (status === 409) {
    const rawMsg = (error.response?.data?.message || error.message || '').toLowerCase();
    if (rawMsg.includes('email')) {
      return 'This email is already registered. Try logging in.';
    }
    return 'This already exists.';
  }

  // 7. HTTP 500 / 502 / 503 / 504: Server or Database Error
  if (status >= 500 && status <= 599) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }

  // 8. Custom API / Validation Message from backend
  const backendMsg =
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    (typeof error.message === 'string' ? error.message : null);

  if (backendMsg && typeof backendMsg === 'string') {
    const trimmed = backendMsg.trim();
    // Verify it doesn't leak SQL, status codes, or stack traces
    if (!isTechnicalMessage(trimmed) && trimmed.length > 0 && trimmed.length <= 250) {
      return trimmed;
    }
  }

  // 9. Safe Default Fallback
  return 'Something went wrong on our side. Please try again in a moment.';
}

/**
 * Validates login input fields before sending requests.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ isValid: boolean, error: string }}
 */
export function validateLoginFields(email, password) {
  const trimmedEmail = (email || '').trim();
  const trimmedPassword = (password || '').trim();

  // Empty fields check
  if (!trimmedEmail || !trimmedPassword) {
    return {
      isValid: false,
      error: 'Please enter your email and password',
    };
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  return { isValid: true, error: '' };
}

export default {
  getFriendlyErrorMessage,
  validateLoginFields,
  isTechnicalMessage,
};
