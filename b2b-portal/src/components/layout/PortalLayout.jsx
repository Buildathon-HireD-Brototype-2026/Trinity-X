import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export function PortalLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('hired_sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hired_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
      <div className="main-wrapper">
        <Navbar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PortalLayout;
