import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DashboardPage from '../../features/dashboard/DashboardPage';
import BlankPage from '../common/BlankPage';
import AdminProfilePage from '../../features/profile/AdminProfilePage';

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
  const [currentView, setCurrentView] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeTitle = VIEW_TITLES[currentView] || 'Dashboard Overview';
  const handleToggleCollapse = () => setIsCollapsed((prev) => !prev);
  const handleOpenProfile = () => setCurrentView('profile');

  return (
    <div className="admin-layout">
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
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
          ) : (
            <BlankPage title={activeTitle} />
          )}
        </main>
      </div>
    </div>
  );
}
