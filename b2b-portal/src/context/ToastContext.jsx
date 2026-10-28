import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', message, duration = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, type, message };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback((message, duration) => addToast({ type: 'success', message, duration }), [addToast]);
  const showError = useCallback((message, duration) => addToast({ type: 'error', message, duration }), [addToast]);
  const showWarning = useCallback((message, duration) => addToast({ type: 'warning', message, duration }), [addToast]);
  const showInfo = useCallback((message, duration) => addToast({ type: 'info', message, duration }), [addToast]);

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          maxWidth: '420px',
          width: 'calc(100vw - 2.5rem)',
          pointerEvents: 'none',
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const bgColor = isSuccess
            ? 'var(--success-bg)'
            : isError
            ? 'var(--danger-bg)'
            : isWarning
            ? 'var(--warning-bg)'
            : 'var(--info-bg)';

          const borderColor = isSuccess
            ? 'var(--success-border)'
            : isError
            ? 'var(--danger-border)'
            : isWarning
            ? 'var(--warning-border)'
            : 'var(--info-border)';

          const iconColor = isSuccess
            ? 'var(--success)'
            : isError
            ? 'var(--danger)'
            : isWarning
            ? 'var(--warning)'
            : 'var(--info)';

          return (
            <div
              key={toast.id}
              className="toast-alert-card"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                lineHeight: 1.45,
                animation: 'toastSlideIn 0.25s ease-out',
                transition: 'all 0.2s ease',
              }}
              role="alert"
            >
              <div style={{ flexShrink: 0, marginTop: '1px', color: iconColor }}>
                {isSuccess && <CheckCircle2 size={18} />}
                {isError && <AlertCircle size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {!isSuccess && !isError && !isWarning && <Info size={18} />}
              </div>
              <div style={{ flex: 1, fontWeight: 500 }}>{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Dismiss alert"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
