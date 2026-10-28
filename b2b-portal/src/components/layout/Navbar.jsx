import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { Building2, Sun, Moon } from 'lucide-react';

export function Navbar() {
  const { partner } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Building2 size={20} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9375rem', lineHeight: 1.2 }}>
              {partner?.name || 'Partner Company'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="brand-badge">B2B Portal</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Night & Day Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun size={19} color="#FBBF24" /> : <Moon size={19} color="var(--primary)" />}
        </button>

        {/* Interactive Notification Dropdown */}
        <NotificationDropdown />

        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {partner?.contact_person || 'Partner User'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {partner?.email_id || 'partner@hire-d.in'}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
