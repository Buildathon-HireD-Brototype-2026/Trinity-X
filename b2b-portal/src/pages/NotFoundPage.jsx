import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <AlertTriangle size={32} />
      </div>
      <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>
        404 — Page Not Found
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        The page you requested could not be located in the HireD Partner Portal.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={18} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}

export default NotFoundPage;
