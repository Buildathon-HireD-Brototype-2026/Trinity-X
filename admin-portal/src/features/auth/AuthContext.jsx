import React, { createContext, useContext, useState, useEffect } from 'react';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import apiClient from '../../services/apiClient';
import { getFriendlyError } from '../../utils/friendlyError';

const AuthContext = createContext(null);

const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours absolute token validity
const SESSION_STORAGE_KEY = 'hired_admin_session';

/**
 * Sanitizes user data so passwords, hashes, or unnecessary fields are never stored.
 * Whitelists strictly necessary claims and enforces an expiration timestamp.
 */
function sanitizeSessionUser(rawUser, existingExpiresAt = null) {
  if (!rawUser) return null;
  const now = Date.now();
  return {
    id: String(rawUser.id || rawUser.admin_id || ''),
    adminId: Number(rawUser.adminId || rawUser.admin_id || rawUser.id) || null,
    name: String(rawUser.name || rawUser.admin_name || 'Administrator'),
    email: String(rawUser.email || rawUser.email_id || '').toLowerCase(),
    phone: String(rawUser.phone || rawUser.phone_no || rawUser.phoneNo || ''),
    role: String(rawUser.role || 'Admin'),
    token: rawUser.token || rawUser.access_token || null,
    expiresAt: existingExpiresAt || rawUser.expiresAt || now + MAX_SESSION_DURATION_MS,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      let saved = sessionStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem('hired_admin_user');

      if (!saved) {
        saved = localStorage.getItem('hired_admin_user');
        if (saved) {
          localStorage.removeItem('hired_admin_user');
          sessionStorage.setItem(SESSION_STORAGE_KEY, saved);
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);

        // Enforce token expiration validation
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          sessionStorage.removeItem('hired_admin_user');
          sessionStorage.setItem('hired_logout_reason', 'relogin');
          return null;
        }

        if (!parsed.token) {
          return null;
        }

        const sanitized = sanitizeSessionUser(parsed, parsed.expiresAt);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Listen for auto-logout / session expiration events triggered by API client
  useEffect(() => {
    const handleAuthExpired = () => {
      logout('relogin');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hired:auth_expired', handleAuthExpired);
      return () => {
        window.removeEventListener('hired:auth_expired', handleAuthExpired);
      };
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      throw new Error('Cannot connect right now. Please check your internet and try again.');
    }

    // Rate-limiting safeguard on local client
    if (failedAttempts >= 5) {
      setLoading(false);
      throw new Error('Too many failed attempts. Please try again in 15 minutes.');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      const res = await apiClient.post('/auth/admin/login', {
        email: normalizedEmail,
        password,
      });

      const token = res?.data?.access_token || res?.access_token;
      if (!token) {
        throw new Error('Invalid email or password. Please try again.');
      }

      const backendUser = res?.data?.user || res?.user || {};
      const sessionUser = sanitizeSessionUser({
        ...backendUser,
        token,
        expiresAt: Date.now() + MAX_SESSION_DURATION_MS,
      });

      setFailedAttempts(0);
      sessionStorage.removeItem('hired_logout_reason');
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
      localStorage.removeItem('hired_admin_user');

      setUser(sessionUser);
      setLoading(false);
      return sessionUser;
    } catch (apiErr) {
      setLoading(false);
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= 5) {
        throw new Error('Too many failed attempts. Please try again in 15 minutes.');
      }

      // Format friendly error message
      const friendlyMsg = getFriendlyError(apiErr, 'Invalid email or password. Please try again.');
      throw new Error(friendlyMsg);
    }
  };

  const logout = (reason = null) => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem('hired_admin_user');
    localStorage.removeItem('hired_admin_user');
    localStorage.removeItem('hired_last_active');
    if (reason) {
      sessionStorage.setItem('hired_logout_reason', reason);
    } else {
      sessionStorage.removeItem('hired_logout_reason');
    }
    setUser(null);
  };

  // Inactivity auto-logout: 15 minutes of inactivity (OWASP compliance)
  useIdleTimer({
    timeoutMs: 15 * 60 * 1000,
    onIdle: () => {
      logout('relogin');
    },
    isEnabled: !!user,
  });

  const updateProfile = (updatedData) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = sanitizeSessionUser({ ...prev, ...updatedData }, prev?.expiresAt);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
