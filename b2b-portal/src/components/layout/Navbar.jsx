import React from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { Building2, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const { partner } = useAuth();

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Building2 size={18} color="var(--primary)" />
          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
            {partner?.name || 'Partner Company'}
          </span>
        </div>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--success)' }}>
          <ShieldCheck size={16} />
          <span>Tenant Verified: Company #{partner?.company_id || '101'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Interactive Notification Dropdown */}
        <NotificationDropdown />

        <div style={{ textAlign: 'right' }}>
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
