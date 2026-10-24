import React from 'react';
import { STATUS_META } from '../../constants/status';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || 'Unknown',
    className: 'status-unassigned',
  };

  return (
    <span className={`status-badge ${meta.className}`} title={meta.description}>
      <span className="status-badge-dot" />
      {meta.label}
    </span>
  );
}

export default StatusBadge;
