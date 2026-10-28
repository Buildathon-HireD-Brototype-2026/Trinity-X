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
  React.useEffect(() => {
    // Anti-Clickjacking runtime check (OWASP framing defense)
    if (window.self !== window.top) {
      try {
        window.top.location = window.self.location;
      } catch {
        // If an attacker sandbox restricts top navigation, wipe DOM
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ef4444;font-size:18px;font-weight:600;">Embedding the HireD Admin Portal in a frame is prohibited for security.</div>';
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
