/**
 * Partner Authentication Service
 * Implements PRD B-01 and database_updated0.2.md Section 10.5
 * - JWT access token (15 mins) & session management
 * - 5 failed attempts lockout (15 minutes)
 * - Tenant isolation verification
 */

import apiClient from './apiClient';
import { MOCK_COMPANY } from './mockData';

const FAILED_ATTEMPTS_KEY = 'hired_b2b_failed_attempts';
const LOCKED_UNTIL_KEY = 'hired_b2b_locked_until';
const TOKEN_KEY = 'hired_b2b_token';
const PARTNER_KEY = 'hired_b2b_partner';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authService = {
  /**
   * Check if the partner is currently locked out
   */
  getLockoutStatus() {
    const lockedUntil = localStorage.getItem(LOCKED_UNTIL_KEY);
    if (!lockedUntil) return { isLocked: false, remainingSeconds: 0 };

    const lockTime = parseInt(lockedUntil, 10);
    const now = Date.now();
    if (now < lockTime) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((lockTime - now) / 1000),
      };
    }

    // Lockout expired; reset counters
    localStorage.removeItem(LOCKED_UNTIL_KEY);
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    return { isLocked: false, remainingSeconds: 0 };
  },

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt() {
    const current = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
    localStorage.setItem(FAILED_ATTEMPTS_KEY, current.toString());

    if (current >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKED_UNTIL_KEY, lockUntil.toString());
      return {
        isLocked: true,
        attempts: current,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    return {
      isLocked: false,
      attempts: current,
      remainingAttempts: MAX_ATTEMPTS - current,
    };
  },

  /**
   * Reset failed attempts upon successful authentication
   */
  resetAttempts() {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKED_UNTIL_KEY);
  },

  /**
   * Authenticate partner with email and password
   */
  async login(email, password) {
    // Check for active lockout first
    const lockout = this.getLockoutStatus();
    if (lockout.isLocked) {
      const mins = Math.ceil(lockout.remainingSeconds / 60);
      throw new Error(`Account temporarily locked due to 5 failed attempts. Please try again in ${mins} minute(s).`);
    }

    const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

    if (useMock) {
      // Simulate realistic network delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      const normalizedEmail = email.trim().toLowerCase();
      const mockEmail = MOCK_COMPANY.email_id.toLowerCase();
      const validPass = 'PartnerPass123!';

      // Account status check (database rule: INACTIVE companies cannot log in)
      if (normalizedEmail === 'inactive@partner.com') {
        throw new Error('Your company account is currently INACTIVE. Please contact HireD Administrator.');
      }

      if (normalizedEmail === mockEmail && password === validPass) {
        this.resetAttempts();

        const mockJwtPayload = {
          token: `hired-jwt-${Date.now()}-company-101`,
          user_type: 'PARTNER',
          user_id: MOCK_COMPANY.company_id,
          session_id: 1,
          company: MOCK_COMPANY,
        };

        localStorage.setItem(TOKEN_KEY, mockJwtPayload.token);
        localStorage.setItem(PARTNER_KEY, JSON.stringify(MOCK_COMPANY));
        return { success: true, partner: MOCK_COMPANY, token: mockJwtPayload.token };
      } else {
        const attemptResult = this.recordFailedAttempt();
        if (attemptResult.isLocked) {
          throw new Error('Maximum login attempts exceeded. Account is locked for 15 minutes.');
        } else {
          throw new Error(
            `Invalid email or password. ${attemptResult.remainingAttempts} attempt(s) remaining before a 15-minute lockout.`
          );
        }
      }
    }

    // Real API integration
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        user_type: 'PARTNER',
      });

      if (response.data && response.data.token) {
        this.resetAttempts();
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(PARTNER_KEY, JSON.stringify(response.data.company));
        return { success: true, partner: response.data.company, token: response.data.token };
      }
      throw new Error('Authentication succeeded but token was missing.');
    } catch (err) {
      const attemptResult = this.recordFailedAttempt();
      const msg = err.response?.data?.message || err.message || 'Login failed';
      if (attemptResult.isLocked) {
        throw new Error('Maximum login attempts exceeded. Account is locked for 15 minutes.');
      }
      throw new Error(msg);
    }
  },

  /**
   * Log out partner and purge session
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PARTNER_KEY);
  },

  /**
   * Retrieve current cached session
   */
  getCurrentPartner() {
    try {
      const data = localStorage.getItem(PARTNER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
};

export default authService;
