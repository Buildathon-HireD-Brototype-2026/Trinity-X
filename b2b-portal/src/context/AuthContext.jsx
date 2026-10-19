import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [partner, setPartner] = useState(() => authService.getCurrentPartner());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      authService.logout();
      setPartner(null);
      setToken(null);
    };

    window.addEventListener('hired:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('hired:auth_expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      setPartner(result.partner);
      setToken(result.token);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
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
