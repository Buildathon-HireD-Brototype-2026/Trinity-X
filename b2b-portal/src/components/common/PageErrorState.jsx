import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * PageErrorState
 * Friendly in-page error message with retry button instead of a blank or broken screen.
 */
export function PageErrorState({
  message = "Something went wrong on our side. Please try again in a moment.",
  onRetry,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`card ${className}`}
      style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        margin: '1rem 0',
        ...style,
      }}
      role="alert"
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <AlertCircle size={28} />
      </div>

      <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
        Unable to load information
      </h3>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          maxWidth: '460px',
          lineHeight: 1.5,
          marginBottom: onRetry ? '1.25rem' : '0',
        }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-primary"
          style={{ gap: '0.45rem', padding: '0.5rem 1.15rem' }}
        >
          <RotateCcw size={16} />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

export default PageErrorState;
