import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DashboardPage from '../../features/dashboard/DashboardPage';
import BlankPage from '../common/BlankPage';
import AdminProfilePage from '../../features/profile/AdminProfilePage';
import AdminManagementPage from '../../features/admin-management/AdminManagementPage';
import DriverOnboardingPage from '../../features/driver-onboarding/DriverOnboardingPage';

const VIEW_TITLES = {
  dashboard: 'Dashboard Overview',
  company: 'Company Directory',
  orders: 'Orders Inbox',
  trips: 'Ongoing Trips',
  drivers: 'Driver Onboarding',
  admins: 'Admin Onboarding',
  invoices: 'Invoice Verification',
  reports: 'Reports',
  profile: 'Admin Profile',
};

export default function AdminShell() {
  const [currentView, setCurrentView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && VIEW_TITLES[tab]) return tab;
    } catch {
      // fallback
    }
    return 'dashboard';
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && VIEW_TITLES[tab]) {
        setCurrentView(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectView = (view) => {
    setCurrentView(view);
    try {
      const url = new URL(window.location);
      url.searchParams.set('tab', view);
      window.history.pushState({}, '', url);
    } catch {
      // ignore
    }
  };

  const activeTitle = VIEW_TITLES[currentView] || 'Dashboard Overview';
  const handleToggleCollapse = () => setIsCollapsed((prev) => !prev);
  const handleOpenProfile = () => handleSelectView('profile');

  return (
    <div className="admin-layout">
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onOpenProfile={handleOpenProfile}
      />

      <div className="admin-main-wrapper">
        <Navbar onOpenProfile={handleOpenProfile} currentView={currentView} />

        {/* Page Content */}
        <main className="admin-page-content">
          {currentView === 'dashboard' ? (
            <DashboardPage onNavigate={setCurrentView} />
          ) : currentView === 'profile' ? (
            <AdminProfilePage onNavigate={setCurrentView} />
          ) : currentView === 'admins' ? (
            <AdminManagementPage />
          ) : currentView === 'drivers' ? (
            <DriverOnboardingPage />
          ) : (
            <BlankPage title={activeTitle} />
          )}
        </main>
      </div>
    </div>
  );
}
