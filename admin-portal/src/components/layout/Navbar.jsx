import React from 'react';
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  Siren
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar({ onOpenProfile, currentView, activeSosCount = 0, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const adminName = user?.name || 'Lead Admin';
  const adminEmail = user?.email || 'admin1@hired.com';
  const isProfileActive = currentView === 'profile';

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <div
          className={`topbar-admin-profile ${isProfileActive ? 'active' : ''}`}
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          title="Click to view full Admin Profile"
        >
          <span className="topbar-admin-name">{adminName}</span>
          <span className="topbar-admin-email">{adminEmail}</span>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {/* Emergency SOS Quick-Bar Indicator */}
        {activeSosCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('sos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
              animation: 'pulseGlow 2s infinite'
            }}
            title={`${activeSosCount} Active Emergency SOS Incidents! Click to open dispatch.`}
          >
            <Siren size={15} />
            <span>{activeSosCount} SOS ALERT{activeSosCount > 1 ? 'S' : ''}</span>
          </button>
        )}

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
          onClick={() => {
            if (activeSosCount > 0 && onNavigate) {
              onNavigate('sos');
            } else {
              alert('All operational systems normal. No critical alerts.');
            }
          }}
        >
          <Bell size={18} />
          {activeSosCount > 0 && (
            <span
              className="notification-dot"
              style={{ background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}
            />
          )}
        </button>

        {/* Admin Badge */}
        <span className="topbar-role-badge">ADMIN</span>

        {/* Topbar Sign Out Action */}
        <button
          type="button"
          className="topbar-icon-btn topbar-logout-btn"
          onClick={logout}
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
