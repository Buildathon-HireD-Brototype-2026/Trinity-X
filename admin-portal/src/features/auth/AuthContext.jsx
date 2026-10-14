import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// TODO (SECURITY): This entire mock auth block MUST be replaced with a real
// server-side API call (e.g. POST /api/auth/login returning a signed JWT)
// before any production deployment. Credentials must never live in client code.
//
// Credentials are loaded from environment variables defined in .env.local
// (gitignored). Run: cp .env.example .env.local  and fill in the passwords.
// ---------------------------------------------------------------------------
function buildMockAdminList() {
  const list = [];

  const email1 = import.meta.env.VITE_DEV_ADMIN1_EMAIL;
  const pass1 = import.meta.env.VITE_DEV_ADMIN1_PASSWORD;
  if (email1 && pass1) {
    list.push({ id: 'ADM-001', name: 'Admin One', email: email1, password: pass1, role: 'Admin', status: 'ACTIVE' });
  }

  const email2 = import.meta.env.VITE_DEV_ADMIN2_EMAIL;
  const pass2 = import.meta.env.VITE_DEV_ADMIN2_PASSWORD;
  if (email2 && pass2) {
    list.push({ id: 'ADM-002', name: 'Admin Two', email: email2, password: pass2, role: 'Admin', status: 'ACTIVE' });
  }

  return list;
}

const MOCK_ADMINS = buildMockAdminList();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hired_admin_user');
      return saved ? JSON.parse(saved) : null;
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

    if (MOCK_ADMINS.length === 0) {
      setLoading(false);
      throw new Error('Auth is not configured. Set VITE_DEV_ADMIN credentials in .env.local.');
    }

    const adminByEmail = MOCK_ADMINS.find((a) => a.email.toLowerCase() === normalizedEmail);

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

    // Login success
    setFailedAttempts(0);
    const sessionUser = {
      id: adminByEmail.id,
      name: adminByEmail.name,
      email: adminByEmail.email,
      role: adminByEmail.role,
      token: `hired_admin_token_${Date.now()}`,
    };

    localStorage.setItem('hired_admin_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setLoading(false);
    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem('hired_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
