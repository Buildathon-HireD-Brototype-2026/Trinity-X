import apiClient from './apiClient';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

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
   * Authenticate partner with email and password against real backend database
   */
  async login(email, password) {
    // Check for active lockout first
    const lockout = this.getLockoutStatus();
    if (lockout.isLocked) {
      const mins = Math.ceil(lockout.remainingSeconds / 60);
      throw new Error(`Account temporarily locked due to 5 failed attempts. Please try again in ${mins} minute(s).`);
    }

    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        user_type: 'PARTNER',
      });

      const data = response.data;
      const token = data.access_token || data.token;
      const partnerData = data.company || data.user || data.data?.user;

      if (token && partnerData) {
        this.resetAttempts();
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(PARTNER_KEY, JSON.stringify(partnerData));
        return { success: true, partner: partnerData, token };
      }

      throw new Error('Something went wrong on our side. Please try again in a moment.');
    } catch (err) {
      const attemptResult = this.recordFailedAttempt();
      if (attemptResult.isLocked) {
        throw new Error('Maximum login attempts exceeded. Account is locked for 15 minutes.');
      }
      const friendly = getFriendlyErrorMessage(err, 'login');
      throw new Error(friendly);
    }
  },

  /**
   * Request a 6-digit OTP for email verification during account registration
   */
  async sendRegisterOtp(email) {
    try {
      const response = await apiClient.post('/auth/otp/send', {
        email: email.trim().toLowerCase(),
        purpose: 'EMAIL_VERIFY',
      });
      return response.data;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
      const friendly = getFriendlyErrorMessage(err, 'register');
      throw new Error(friendly);
    }
  },

  /**
   * Register a new corporate account with verified OTP
   */
  async register({ companyName, contactPerson, phoneNo, email, password, otp }) {
    try {
      const response = await apiClient.post('/auth/register', {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        phoneNo: phoneNo.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp: String(otp).trim(),
      });

      if (response.data?.access_token) {
        localStorage.setItem(TOKEN_KEY, response.data.access_token);
        if (response.data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        }
      }

      return response.data;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
      const friendly = getFriendlyErrorMessage(err, 'register');
      throw new Error(friendly);
    }
  },

  /**
   * Request a 6-digit OTP for password reset
   */
  async sendForgotPasswordOtp(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password/send-otp', {
        email: email.trim().toLowerCase(),
        purpose: 'PASSWORD_RESET',
      });
      return response.data;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
      const friendly = getFriendlyErrorMessage(err, 'password_reset');
      throw new Error(friendly);
    }
  },

  /**
   * Reset password with the 6-digit OTP
   */
  async resetPasswordWithOtp({ email, otp, newPassword }) {
    try {
      const response = await apiClient.post('/auth/forgot-password/reset', {
        email: email.trim().toLowerCase(),
        otp: String(otp).trim(),
        newPassword,
      });
      return response.data;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
      const friendly = getFriendlyErrorMessage(err, 'password_reset');
      throw new Error(friendly);
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
