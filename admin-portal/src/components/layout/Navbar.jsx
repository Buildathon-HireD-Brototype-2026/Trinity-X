import React from 'react';
import {
  Bell,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const adminName = user?.name || 'Neha Sharma';
  const adminEmail = user?.email || 'admin2@hired.com';

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <div className="topbar-admin-profile">
          <span className="topbar-admin-name">{adminName}</span>
          <span className="topbar-admin-email">{adminEmail}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          className="topbar-icon-btn topbar-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="topbar-icon-btn"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => alert('No new notifications')}
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        {/* Admin Badge */}
        <span className="topbar-role-badge">ADMIN</span>
      </div>
    </header>
  );
}
