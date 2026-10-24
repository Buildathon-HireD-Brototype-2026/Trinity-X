import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export default function DashboardHeader() {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="dashboard-header" aria-label="Dashboard Header">
      <div className="dashboard-header-left">
        <div className="dashboard-greeting-pill">
          <Sparkles size={14} className="dashboard-greeting-icon" />
          <span>Operational Control Center</span>
        </div>
        <h1 className="dashboard-title">
          Operations <span className="dashboard-title-highlight">Dashboard</span>
        </h1>
        <p className="dashboard-subtitle">
          Real-time platform overview of incoming orders, active trips, and driver availability.
        </p>
      </div>

      <div className="dashboard-header-right">
        <div className="dashboard-date-badge">
          <Calendar size={16} className="dashboard-date-icon" />
          <span className="dashboard-date-text">{formattedDate}</span>
        </div>
      </div>
    </header>
  );
}
