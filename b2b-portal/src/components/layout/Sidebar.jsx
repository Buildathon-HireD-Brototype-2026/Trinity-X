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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export function Sidebar({ isCollapsed, onToggleCollapse }) {
  const { partner, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/orders/new', label: 'Create Order', icon: PlusCircle, end: true },
    { to: '/orders', label: 'My Orders & Trips', icon: Clock, end: true },
    { to: '/reports', label: 'Trip Reports', icon: FileSpreadsheet, end: true },
    { to: '/statements', label: 'Statements', icon: Receipt, end: true },
  ];

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand-group">
          <img src="/logo.svg" alt="HireD" className="brand-logo-img" />
          <span className="brand-badge">B2B Portal</span>
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Partner Info & Logout */}
      <div className="sidebar-footer">
        <div className="partner-profile-card">
          <div
            className="partner-avatar"
            title={`${partner?.name || 'Partner Company'} (${partner?.contact_person || 'Partner User'})`}
          >
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
            className="sidebar-logout-btn"
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid transparent',
              transition: 'all 0.15s ease',
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
