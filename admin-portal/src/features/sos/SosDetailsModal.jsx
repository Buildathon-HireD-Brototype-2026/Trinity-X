import React from 'react';
import {
  X,
  AlertTriangle,
  HeartPulse,
  Wrench,
  MapPin,
  ExternalLink,
  Phone,
  User,
  Building2,
  Car,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  FileText
} from 'lucide-react';
import { getReasonMeta, formatDateTime, formatElapsed } from './sosService';

export default function SosDetailsModal({
  isOpen,
  onClose,
  alert,
  onClaim,
  onOpenResolve,
  currentAdminId
}) {
  if (!isOpen || !alert) return null;

  const reasonMeta = getReasonMeta(alert.reason);
  const mapUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
  const isOpenStatus = alert.status === 'OPEN';
  const isInProgress = alert.status === 'IN_PROGRESS';
  const isResolved = alert.status === 'RESOLVED';
  const isClaimedByMe = Number(alert.claimedByAdminId) === Number(currentAdminId);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          maxWidth: '720px',
          maxHeight: '90vh',
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
            background: isOpenStatus
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)'
              : isInProgress
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isOpenStatus ? '#ef4444' : isInProgress ? '#f59e0b' : '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${
                  isOpenStatus ? 'rgba(239, 68, 68, 0.4)' : isInProgress ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                }`
              }}
            >
              {alert.reason === 'MEDICAL_EMERGENCY' ? <HeartPulse size={22} /> : <Wrench size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  id="sos-details-title"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    margin: 0
                  }}
                >
                  Incident #{alert.alertId} — {reasonMeta.label}
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: isOpenStatus ? 'rgba(239, 68, 68, 0.2)' : isInProgress ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isOpenStatus ? '#ef4444' : isInProgress ? '#f59e0b' : '#10b981',
                    border: `1px solid ${isOpenStatus ? 'rgba(239, 68, 68, 0.4)' : isInProgress ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                  }}
                >
                  {alert.status}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Triggered {formatElapsed(alert.createdAt)} • Trip #{alert.tripId}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
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

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Driver's Voice / Emergency Notes */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: reasonMeta.bg,
              border: `1px solid ${reasonMeta.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertTriangle size={20} style={{ color: reasonMeta.color, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: reasonMeta.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Driver Emergency Message
              </span>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.5 }}>
                "{alert.notes}"
              </p>
            </div>
          </div>

          {/* Location & GPS Panel */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'var(--background)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} style={{ color: '#ef4444' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Live Incident GPS Coordinates
                </span>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  textDecoration: 'none'
                }}
              >
                Open Google Maps <ExternalLink size={14} />
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>LATITUDE / LONGITUDE</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 600
                }}
              >
                ● GPS Locked
              </span>
            </div>
          </div>

          {/* Key Parties: Driver & Corporate Passenger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Driver Card */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'var(--background)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <User size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Driver Information
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {alert.driverName}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                ID: DRV-{alert.driverId}
              </div>
              <a
                href={`tel:${alert.driverPhone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(106, 55, 159, 0.1)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  textDecoration: 'none'
                }}
              >
                <Phone size={14} /> Call Driver ({alert.driverPhone})
              </a>
            </div>

            {/* Corporate / Passenger Card */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'var(--background)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Building2 size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Partner & Passenger
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {alert.companyName}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Contact: {alert.order?.contactName || 'Corporate Guest'}
              </div>
              {alert.order?.contactPhone && alert.order?.contactPhone !== '—' && (
                <a
                  href={`tel:${alert.order.contactPhone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(71, 85, 105, 0.1)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    textDecoration: 'none'
                  }}
                >
                  <Phone size={14} /> Call Contact ({alert.order.contactPhone})
                </a>
              )}
            </div>
          </div>

          {/* Route Card */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'var(--background)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Car size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Route Information (Trip #{alert.tripId})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <strong style={{ color: 'var(--text-muted)' }}>Pickup:</strong>
                <span style={{ color: 'var(--text-main)' }}>{alert.order?.pickupSpot || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <strong style={{ color: 'var(--text-muted)' }}>Dropoff:</strong>
                <span style={{ color: 'var(--text-main)' }}>{alert.order?.dropoffSpot || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Incident Timeline */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'var(--background)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Incident Event Timeline
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
              {/* Event 1: Triggered */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  !
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    Emergency SOS Triggered by {alert.driverName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDateTime(alert.createdAt)}
                  </div>
                </div>
              </div>

              {/* Event 2: Claimed */}
              {alert.claimedAt && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      Incident Claimed by {alert.claimedByAdminName || 'Operations Admin'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(alert.claimedAt)}
                    </div>
                  </div>
                </div>
              )}

              {/* Event 3: Resolved */}
              {alert.resolvedAt && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      Incident Fully Resolved
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {formatDateTime(alert.resolvedAt)}
                    </div>
                    {alert.resolutionNotes && (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: 'var(--text-main)'
                        }}
                      >
                        <strong>Resolution:</strong> {alert.resolutionNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close Dossier
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isOpenStatus && (
              <button
                type="button"
                onClick={() => {
                  onClaim(alert);
                  onClose();
                }}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                }}
              >
                <ShieldAlert size={16} />
                Claim This Incident
              </button>
            )}

            {isInProgress && isClaimedByMe && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenResolve(alert);
                }}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CheckCircle2 size={16} />
                Resolve Incident
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
