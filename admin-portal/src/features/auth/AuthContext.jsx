import React, { createContext, useContext, useState, useEffect } from 'react';
import { useIdleTimer } from '../../hooks/useIdleTimer';

const AuthContext = createContext(null);

// Security Safeguard (OWASP ASVS): In production environments, mock administrative credentials
// must never be bundled or shipped to clients.
const DEFAULT_ADMINS = import.meta.env.PROD
  ? []
  : [
      {
        id: 'ADM-001',
        name: 'Admin One',
        email: 'admin1@hired.com',
        phone: '+91 98450 11223',
        password: 'Password@123',
        role: 'Admin',
        status: 'ACTIVE',
      },
      {
        id: 'ADM-002',
        name: 'Neha Sharma',
        email: 'admin2@hired.com',
        phone: '+91 98765 43210',
        password: 'Password@123',
        role: 'Admin',
        status: 'ACTIVE',
      },
      {
        id: 'ADM-003',
        name: 'Inactive Admin',
        email: 'inactive@hired.com',
        phone: '+91 98111 22334',
        password: 'Password@123',
        role: 'Admin',
        status: 'INACTIVE',
      },
    ];

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
    id: String(rawUser.id || ''),
    name: String(rawUser.name || ''),
    email: String(rawUser.email || '').toLowerCase(),
    phone: String(rawUser.phone || (rawUser.email === 'admin1@hired.com' ? '+91 98450 11223' : '+91 98765 43210')),
    role: String(rawUser.role || 'Admin'),
    token: rawUser.token || `hired_admin_token_${now}`,
    expiresAt: existingExpiresAt || rawUser.expiresAt || now + MAX_SESSION_DURATION_MS,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      // 1. Read from isolated sessionStorage (prevents disk exposure and tab leaks)
      let saved = sessionStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem('hired_admin_user');

      // 2. Migration fallback: purge legacy localStorage to protect existing users
      if (!saved) {
        saved = localStorage.getItem('hired_admin_user');
        if (saved) {
          localStorage.removeItem('hired_admin_user'); // Clean disk storage
          sessionStorage.setItem(SESSION_STORAGE_KEY, saved);
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);

        // 3. Enforce token expiration validation
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          sessionStorage.removeItem('hired_admin_user');
          sessionStorage.setItem('hired_logout_reason', 'expired');
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

  const login = async (email, password) => {
    setLoading(true);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      throw new Error('Unable to connect to server. Please check your connection.');
    }

    await new Promise((resolve) => setTimeout(resolve, 350));

    // Check account lockout rate-limiting
    if (failedAttempts >= 5) {
      setLoading(false);
      throw new Error('Too many failed attempts. Please try again in 15 minutes.');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const adminByEmail = DEFAULT_ADMINS.find((a) => a.email.toLowerCase() === normalizedEmail);

    if (!adminByEmail || adminByEmail.password !== password) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      setLoading(false);

      if (nextFailures >= 5) {
        throw new Error('Too many failed attempts. Please try again in 15 minutes.');
      }
      throw new Error('Invalid email or password. Please try again.');
    }

    // Check deactivated account status
    if (adminByEmail.status === 'INACTIVE') {
      setLoading(false);
      throw new Error('Your account is deactivated. Please contact support.');
    }

    // Login success: sanitize session and enforce absolute expiry
    setFailedAttempts(0);
    const sessionUser = sanitizeSessionUser(adminByEmail);

    // Clear any previous logout reason on fresh login
    sessionStorage.removeItem('hired_logout_reason');

    // Securely persist in sessionStorage only (NOT long-lived localStorage)
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    localStorage.removeItem('hired_admin_user'); // Clean disk storage

    setUser(sessionUser);
    setLoading(false);
    return sessionUser;
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
      logout('inactivity');
    },
    isEnabled: !!user,
  });

  const updateProfile = (updatedData) => {
    setUser((prev) => {
      const updated = sanitizeSessionUser({ ...prev, ...updatedData }, prev?.expiresAt);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      const idx = DEFAULT_ADMINS.findIndex((a) => a.id === updated.id || a.email === prev?.email);
      if (idx !== -1) {
        DEFAULT_ADMINS[idx] = { ...DEFAULT_ADMINS[idx], ...updatedData };
      }
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

export function registerAuthAdmin({ id, name, email, phone, password, status = 'ACTIVE' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const existing = DEFAULT_ADMINS.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!existing) {
    DEFAULT_ADMINS.push({
      id,
      name,
      email: normalizedEmail,
      phone,
      password: password || 'Password@123',
      role: 'Admin',
      status,
    });
  } else {
    existing.status = status;
    if (password) existing.password = password;
  }
}

export function updateAuthAdminStatus(idOrEmail, newStatus) {
  const target = DEFAULT_ADMINS.find(
    (a) => a.id === idOrEmail || a.email.toLowerCase() === (idOrEmail || '').toLowerCase()
  );
  if (target) {
    target.status = newStatus;
  }
}

