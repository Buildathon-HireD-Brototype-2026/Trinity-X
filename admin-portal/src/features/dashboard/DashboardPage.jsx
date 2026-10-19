import React from 'react';
import { Car, Receipt } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';
import MetricCard from './components/MetricCard';
import RecentOrdersTable from './components/RecentOrdersTable';

export default function DashboardPage({ onNavigate }) {
  return (
    <div className="dashboard-container">
      <DashboardHeader />

      {/* Top Operational Metric Cards */}
      <section className="dashboard-top-metrics" aria-label="Key Operational Indicators">
        <MetricCard
          title="Ongoing Trips"
          value="8"
          badgeText="Live on Route"
          badgeVariant="primary"
          description="Active vehicle trips in transit. Monitor GPS progress and field statuses."
          actionText="View Ongoing Trips"
          icon={Car}
          onClick={() => onNavigate && onNavigate('trips')}
        />
        <MetricCard
          title="Pending Invoice Verification"
          value="3"
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

