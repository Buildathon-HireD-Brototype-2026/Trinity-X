import React from 'react';
import { Construction } from 'lucide-react';

export function PlaceholderPage({ title, featureId, description }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--primary-100)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <Construction size={32} />
      </div>
      <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
        {description}
      </p>
      <div
        style={{
          display: 'inline-block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--primary)',
          backgroundColor: 'var(--primary-50)',
          padding: '0.35rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--primary-200)',
        }}
      >
        Scheduled for next step ({featureId})
      </div>
    </div>
  );
}

export default PlaceholderPage;
