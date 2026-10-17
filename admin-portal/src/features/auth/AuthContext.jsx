import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  // Safe non-sensitive profile state (restores tab visual state without storing raw secret tokens in localStorage)
  const [user, setUser] = useState(() => {
    try {
      const savedProfile = sessionStorage.getItem('hired_admin_profile');
      return savedProfile ? JSON.parse(savedProfile) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Silent session hydration via httpOnly cookie on app mount / refresh
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Sends httpOnly refreshToken cookie
      });

      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        const newToken = data?.access_token || data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          setUser((prev) => (prev ? { ...prev, token: newToken } : prev));
        }
      } else {
        // Cookie expired or invalid
        sessionStorage.removeItem('hired_admin_profile');
        setUser(null);
        setAccessToken(null);
      }
    } catch {
      // Offline or network error
    }
  }, []);

  useEffect(() => {
    // Only attempt silent session hydration on mount if a session was previously active
    if (sessionStorage.getItem('hired_admin_profile')) {
      refreshSession();
    }
  }, [refreshSession]);

  // Synchronize logout across multiple open admin tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'hired_admin_logout_signal') {
        sessionStorage.removeItem('hired_admin_profile');
        setUser(null);
        setAccessToken(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email, password) => {
    setLoading(true);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      throw new Error('Unable to connect to server. Please check your connection.');
    }

    // Client-side lockout check
    if (failedAttempts >= 5) {
      setLoading(false);
      throw new Error('Too many failed attempts. Please try again in 15 minutes.');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Receives httpOnly refreshToken cookie
        body: JSON.stringify({
          email_id: normalizedEmail,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const nextFailures = failedAttempts + 1;
        setFailedAttempts(nextFailures);
        setLoading(false);

        if (nextFailures >= 5) {
          throw new Error('Too many failed attempts. Please try again in 15 minutes.');
        }

        const msg = json?.message || 'Invalid email or password. Please try again.';
        throw new Error(msg);
      }

      setFailedAttempts(0);
      const data = json?.data || json;
      const apiUser = data?.user || {};
      const token = data?.access_token || data?.accessToken || null;

      // Safe non-sensitive profile (safe for sessionStorage)
      const safeProfile = {
        id: apiUser.adminId || apiUser.id || 'ADM-001',
        name: apiUser.adminName || apiUser.name || 'Admin',
        email: apiUser.emailId || apiUser.email || normalizedEmail,
        role: apiUser.userType || apiUser.role || 'Admin',
      };

      // Raw JWT token is kept strictly in React memory (prevents XSS extraction via localStorage)
      const sessionUser = {
        ...safeProfile,
        token,
      };

      try {
        sessionStorage.setItem('hired_admin_profile', JSON.stringify(safeProfile));
        // Remove any legacy tokens from localStorage to prevent token exposure
        localStorage.removeItem('hired_admin_token');
        localStorage.removeItem('hired_admin_user');
      } catch {
        // Ignore storage quotas / disabled storage
      }

      setAccessToken(token);
      setUser(sessionUser);
      setLoading(false);
      return sessionUser;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Ignore network failure on logout
    } finally {
      sessionStorage.removeItem('hired_admin_profile');
      localStorage.removeItem('hired_admin_token');
      localStorage.removeItem('hired_admin_user');
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ? { ...user, token: accessToken || user.token } : null,
        isAuthenticated: !!user,
        accessToken,
        login,
        logout,
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
