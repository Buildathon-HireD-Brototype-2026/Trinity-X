import React from 'react';
import {
  Inbox,
  Car,
  Receipt,
} from 'lucide-react';
import MetricCard from './MetricCard';

export default function MetricGrid({ onMetricClick }) {
  const operationalCards = [
    {
      id: 'orders',
      title: 'Orders Inbox',
      value: '12',
      badgeText: 'Pending Review',
      badgeVariant: 'warning',
      description: 'Incoming customer orders awaiting administrative decision (Accept or Reject).',
      actionText: 'Open Orders Inbox',
      icon: Inbox,
    },
    {
      id: 'trips',
      title: 'Ongoing Trips',
      value: '8',
      badgeText: 'Live on Route',
      badgeVariant: 'primary',
      description: 'Active vehicle trips in transit. Monitor GPS progress and field statuses.',
      actionText: 'View Ongoing Trips',
      icon: Car,
    },
    {
      id: 'invoices',
      title: 'Invoice Verification',
      value: '3',
      badgeText: 'Verification Queue',
      badgeVariant: 'indigo',
      description: 'Month-end company statements awaiting two-person administrator sign-off.',
      actionText: 'Verify Invoices',
      icon: Receipt,
    },
  ];

  return (
    <section className="pro-metric-grid" aria-label="Operational Milestones Overview">
      {operationalCards.map((card) => (
        <MetricCard
          key={card.id}
          title={card.title}
          milestone={card.milestone}
          value={card.value}
          badgeText={card.badgeText}
          badgeVariant={card.badgeVariant}
          description={card.description}
          actionText={card.actionText}
          icon={card.icon}
          onClick={() => onMetricClick(card.id)}
        />
      ))}
    </section>
  );
}
