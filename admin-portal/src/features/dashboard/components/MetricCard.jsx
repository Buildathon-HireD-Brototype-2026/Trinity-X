import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function MetricCard({
  title,
  milestone,
  value,
  badgeText,
  badgeVariant = 'primary',
  description,
  icon: Icon,
  actionText = 'View Details',
  onClick,
}) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`pro-metric-card ${isClickable ? 'pro-metric-card--clickable' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="pro-metric-header">
        <div className="pro-metric-title-group">
          <span className="pro-metric-title">{title}</span>
          {milestone && <span className="pro-milestone-pill">{milestone}</span>}
        </div>
        {Icon && (
          <div className={`pro-metric-icon-wrap pro-metric-icon-wrap--${badgeVariant}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="pro-metric-value-row">
        <span className="pro-metric-number">{value}</span>
        {badgeText && (
          <span className={`pro-status-pill pro-status-pill--${badgeVariant}`}>
            {badgeText}
          </span>
        )}
      </div>

      {description && <p className="pro-metric-desc">{description}</p>}

      <div className="pro-metric-footer">
        <span className="pro-action-text">{actionText}</span>
        <ArrowRight size={14} className="pro-action-arrow" />
      </div>
    </div>
  );
}
