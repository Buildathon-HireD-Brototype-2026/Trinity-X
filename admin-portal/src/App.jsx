import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';
import AdminShell from './components/layout/AdminShell';

function MainContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AdminShell /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
