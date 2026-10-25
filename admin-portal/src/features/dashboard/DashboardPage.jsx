import React, { useState, useEffect } from 'react';
import { Car, Receipt } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';
import MetricCard from './components/MetricCard';
import RecentOrdersTable from './components/RecentOrdersTable';
import { getDashboardMetrics } from './dashboardService';

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState({
    ongoingTrips: '8',
    pendingInvoices: '3',
  });

  useEffect(() => {
    let isMounted = true;
    getDashboardMetrics().then((data) => {
      if (isMounted && data) {
        setMetrics(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard-container">
      <DashboardHeader />

      {/* Top Operational Metric Cards */}
      <section className="dashboard-top-metrics" aria-label="Key Operational Indicators">
        <MetricCard
          title="Ongoing Trips"
          value={metrics.ongoingTrips}
          badgeText="Live on Route"
          badgeVariant="primary"
          description="Active vehicle trips in transit. Monitor GPS progress and field statuses."
          actionText="View Ongoing Trips"
          icon={Car}
          onClick={() => onNavigate && onNavigate('trips')}
        />
        <MetricCard
          title="Pending Invoice Verification"
          value={metrics.pendingInvoices}
          badgeText="Verification Queue"
          badgeVariant="indigo"
          description="Month-end company statements awaiting two-person administrator sign-off."
          actionText="Verify Invoices"
          icon={Receipt}
          onClick={() => onNavigate && onNavigate('invoices')}
        />
      </section>

      {/* Recent Orders Table */}
      <RecentOrdersTable onNavigate={onNavigate} />
    </div>
  );
}

