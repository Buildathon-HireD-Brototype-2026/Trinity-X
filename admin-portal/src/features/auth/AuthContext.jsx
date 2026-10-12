import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_ADMINS = [
  {
    id: 'ADM-001',
    name: 'Admin One',
    email: 'admin1@hired.com',
    password: 'Password@123',
    role: 'Admin',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-002',
    name: 'Admin Two',
    email: 'admin2@hired.com',
    password: 'Password@123',
    role: 'Admin',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-003',
    name: 'Inactive Admin',
    email: 'inactive@hired.com',
    password: 'Password@123',
    role: 'Admin',
    status: 'INACTIVE',
  },
];

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
