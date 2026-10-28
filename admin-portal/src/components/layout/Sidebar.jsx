import React from 'react';
import {
  Building2,
  Inbox,
  Car,
  UserPlus,
  Receipt,
  BarChart3,
  LogOut,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Siren
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import logoSvg from '../../assets/logo.svg';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'sos',
    label: 'Emergency SOS',
    icon: Siren,
    isEmergency: true,
  },
  {
    id: 'company',
    label: 'Company Directory',
    icon: Building2,
  },
  {
    id: 'orders',
    label: 'Orders Inbox',
    icon: Inbox,
  },
  {
    id: 'trips',
    label: 'Ongoing Trips',
    icon: Car,
  },
  {
    id: 'drivers',
    label: 'Driver Onboarding',
    icon: UserPlus,
  },
  {
    id: 'admins',
    label: 'Admin Onboarding',
    icon: ShieldCheck,
  },
  {
    id: 'invoices',
    label: 'Invoice Verification',
    icon: Receipt,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
  },
];

export default function Sidebar({
  currentView,
  onSelectView,
  isCollapsed = false,
  onToggleCollapse,
  onOpenProfile,
  activeSosCount = 0,
}) {
  const { user, logout } = useAuth();

  const adminName = user?.name || 'Neha Sharma';
  const adminEmail = user?.email || 'admin2@hired.com';
  const initial = adminName.charAt(0).toUpperCase();

  return (
    <aside
      className={`admin-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        {!isCollapsed && (
          <div
            className="sidebar-logo-wrap"
            onClick={() => onSelectView('dashboard')}
            role="button"
            tabIndex={0}
            title="HireD Admin Dashboard"
          >
            <img src={logoSvg} alt="HireD" className="sidebar-logo" />
          </div>
        )}

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Section Header (Hidden when collapsed) */}
      {!isCollapsed && (
        <div className="sidebar-section-header">
          <span>OPERATIONAL MILESTONES</span>
        </div>
      )}

      {/* Nav List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isSos = item.id === 'sos';
          const hasActiveSos = isSos && activeSosCount > 0;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''} ${hasActiveSos ? 'has-sos-alert' : ''}`}
              onClick={() => onSelectView(item.id)}
              title={hasActiveSos ? `${item.label} (${activeSosCount} active alerts)` : item.label}
              aria-label={item.label}
              style={
                hasActiveSos
                  ? {
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      background: isActive ? undefined : 'rgba(239, 68, 68, 0.08)'
                    }
                  : undefined
              }
            >
              <div className="nav-item-left" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Icon
                    size={18}
                    className="nav-item-icon"
                    style={hasActiveSos ? { color: '#ef4444' } : undefined}
                  />
                  {!isCollapsed && (
                    <span
                      className="nav-item-label"
                      style={hasActiveSos ? { color: '#ef4444', fontWeight: 700 } : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Pulsing Active Count Badge */}
                {hasActiveSos && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: isCollapsed ? '2px 5px' : '2px 7px',
                      borderRadius: '999px',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                    }}
                  >
                    {activeSosCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile Footer */}
      <div className="sidebar-footer">
        <div
          className={`sidebar-user-card ${currentView === 'profile' ? 'active' : ''}`}
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          title={`View Admin Profile: ${adminName} (${adminEmail})`}
        >
          <div className="sidebar-user-avatar">
            <span>{initial}</span>
          </div>
          {!isCollapsed && (
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{adminName}</span>
              <span className="sidebar-user-email">{adminEmail}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          id="sidebar-logout-btn"
          className="sidebar-logout-btn"
          onClick={logout}
          title="Sign out of console"
          aria-label="Sign out of console"
        >
          <LogOut size={14} />
          {!isCollapsed && <span>Sign Out of Console</span>}
        </button>
      </div>
    </aside>
  );
}
