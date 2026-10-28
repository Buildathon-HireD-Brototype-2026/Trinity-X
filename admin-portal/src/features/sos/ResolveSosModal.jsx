import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Clock, User, Car } from 'lucide-react';
import { resolveSosAlert, getReasonMeta } from './sosService';

const RESOLUTION_TEMPLATES = [
  {
    label: '🚑 Medical Dispatch',
    text: 'Ambulance and paramedic team dispatched to driver location. Passenger and driver medically evaluated and in safe care.'
  },
  {
    label: '🚗 Backup Chauffeur',
    text: 'Replacement vehicle and backup driver dispatched. Passengers safely transferred to new car; trip ongoing.'
  },
  {
    label: '🔧 Roadside Assistance',
    text: 'Tow truck and mobile mechanic arrived on site. Vehicle breakdown addressed and towed safely.'
  },
  {
    label: '✅ False Alarm Verified',
    text: 'Contacted driver via phone; confirmed accidental SOS trigger. Driver and passenger safe, trip resuming normal route.'
  }
];

export default function ResolveSosModal({ isOpen, onClose, alert, onResolved }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setResolutionNotes('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, alert]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !alert) return null;

  const reasonMeta = getReasonMeta(alert.reason);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setErrorMsg('Please enter resolution notes describing the actions taken.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const updated = await resolveSosAlert(alert.alertId, resolutionNotes.trim());
      onResolved(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resolve emergency incident.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div
        className="modal-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2
                id="resolve-modal-title"
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0
                }}
              >
                Resolve Emergency Incident #{alert.alertId}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Document resolution actions taken by operations dispatch
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {errorMsg && (
            <div
              style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Incident Snapshot Card */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>REASON</span>
              <span style={{ fontWeight: 600, color: reasonMeta.color }}>{reasonMeta.label}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>DRIVER</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{alert.driverName}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>TRIP / ROUTE</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Trip #{alert.tripId}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>PARTNER</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{alert.companyName}</span>
            </div>
          </div>

          {/* Quick-Pick Resolution Templates */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.5rem'
              }}
            >
              <Sparkles size={14} style={{ color: '#10b981' }} />
              Quick Resolution Templates
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {RESOLUTION_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setResolutionNotes(tmpl.text)}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: resolutionNotes === tmpl.text ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontWeight: 600, display: 'block' }}>{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Notes Textarea */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="resolution-notes-input"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.5rem'
              }}
            >
              Incident Resolution Report & Notes <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              id="resolution-notes-input"
              rows={4}
              required
              placeholder="Detail actions taken: e.g. medical emergency services contacted, replacement vehicle deployed, passenger status, tow truck dispatched..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !resolutionNotes.trim()}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: (isSubmitting || !resolutionNotes.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: (isSubmitting || !resolutionNotes.trim()) ? 0.6 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <Clock size={16} className="spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm Incident Resolved
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
