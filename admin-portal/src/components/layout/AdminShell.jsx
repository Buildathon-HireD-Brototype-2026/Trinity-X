import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DashboardPage from '../../features/dashboard/DashboardPage';
import BlankPage from '../common/BlankPage';
import AdminProfilePage from '../../features/profile/AdminProfilePage';
import AdminManagementPage from '../../features/admin-management/AdminManagementPage';
import DriverOnboardingPage from '../../features/driver-onboarding/DriverOnboardingPage';
import CompanyDirectoryPage from '../../features/company-directory/CompanyDirectoryPage';
import OrdersInboxPage from '../../features/orders-inbox/OrdersInboxPage';
import TripsAssignmentPage from '../../features/trips-assignment/TripsAssignmentPage';
import TripReportsPage from '../../features/reports/TripReportsPage';
import InvoiceVerificationPage from '../../features/invoices/InvoiceVerificationPage';
import useScreenDimensions from '../../hooks/useScreenDimensions';

const VIEW_TITLES = {
  dashboard: 'Dashboard Overview',
  company: 'Company Directory',
  orders: 'Orders Inbox',
  trips: 'Trips & Driver Assignment',
  drivers: 'Driver Onboarding',
  admins: 'Admin Onboarding',
  invoices: 'Invoice Verification',
  reports: 'Reports',
  profile: 'Admin Profile',
};

export default function AdminShell() {
  const screen = useScreenDimensions();
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return true;
    return false;
  });

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
      const url = new URL(window.location.href);
      url.searchParams.set('tab', view);
      window.history.pushState({}, '', url.pathname + url.search);
    } catch {
      try {
        window.history.pushState({}, '', `?tab=${view}`);
      } catch {
        // ignore
      }
    }
  };

  const activeTitle = VIEW_TITLES[currentView] || 'Dashboard Overview';
  const handleToggleCollapse = () => setIsCollapsed((prev) => !prev);
  const handleOpenProfile = () => handleSelectView('profile');

  const screenSize = screen.isMobile ? 'mobile' : screen.isTablet ? 'tablet' : screen.isWide ? 'wide' : 'desktop';

  return (
    <div
      className="admin-layout"
      data-screen-size={screenSize}
      data-orientation={screen.orientation}
    >
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
            <DashboardPage onNavigate={handleSelectView} />
          ) : currentView === 'profile' ? (
            <AdminProfilePage onNavigate={handleSelectView} />
          ) : currentView === 'admins' ? (
            <AdminManagementPage />
          ) : currentView === 'drivers' ? (
            <DriverOnboardingPage />
          ) : currentView === 'company' ? (
            <CompanyDirectoryPage />
          ) : currentView === 'orders' ? (
            <OrdersInboxPage />
          ) : currentView === 'trips' ? (
            <TripsAssignmentPage />
          ) : currentView === 'invoices' ? (
            <InvoiceVerificationPage />
          ) : currentView === 'reports' ? (
            <TripReportsPage />
          ) : (
            <BlankPage title={activeTitle} />
          )}
        </main>
      </div>
    </div>
  );
}
