import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  FileSpreadsheet,
  Receipt,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const { partner, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/orders/new', label: 'Create Order', icon: PlusCircle },
    { to: '/orders', label: 'My Orders & Trips', icon: Clock },
    { to: '/reports', label: 'Trip Reports', icon: FileSpreadsheet },
    { to: '/statements', label: 'Statements', icon: Receipt },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.svg" alt="HireD" className="brand-logo-img" />
        <span className="brand-badge">B2B Portal</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="partner-profile-card">
          <div className="partner-avatar">
            {partner?.name ? partner.name.charAt(0) : 'P'}
          </div>
          <div className="partner-info">
            <div className="partner-company-name" title={partner?.name}>
              {partner?.name || 'Partner Company'}
            </div>
            <div className="partner-contact-sub" title={partner?.email_id}>
              {partner?.contact_person || 'Authorized Partner'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
