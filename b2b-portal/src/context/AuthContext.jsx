import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_COMPANY } from '../services/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [partner, setPartner] = useState(() => {
    const saved = localStorage.getItem('hired_b2b_partner');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to mock partner for initial setup development
    return MOCK_COMPANY;
  });

  const [token, setToken] = useState(() => localStorage.getItem('hired_b2b_token') || 'mock-jwt-token-partner-101');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      setPartner(null);
      setToken(null);
    };

    window.addEventListener('hired:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('hired:auth_expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // In Feature 2, this calls the auth service / backend API
      if (email.toLowerCase() === MOCK_COMPANY.email_id.toLowerCase()) {
        const dummyToken = 'mock-jwt-token-partner-101';
        localStorage.setItem('hired_b2b_token', dummyToken);
        localStorage.setItem('hired_b2b_partner', JSON.stringify(MOCK_COMPANY));
        setPartner(MOCK_COMPANY);
        setToken(dummyToken);
        return { success: true };
      } else {
        throw new Error('Invalid partner credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hired_b2b_token');
    localStorage.removeItem('hired_b2b_partner');
    setPartner(null);
    setToken(null);
  };

  const value = {
    partner,
    token,
    isAuthenticated: Boolean(partner && token),
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
