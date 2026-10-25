import React, { useState, useEffect } from 'react';
import {
  X,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  ArrowRight,
  Car,
  Calendar,
  Clock,
  Phone,
  User,
  Star,
  Building2,
  DollarSign,
  KeyRound,
  ShieldCheck,
  Check
} from 'lucide-react';
import { updateTripStatus } from './tripService';

export default function TripDetailsModal({
  isOpen,
  onClose,
  trip,
  onStatusUpdated,
  canManageTrips = false // Strict fail-closed default
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Reset state on modal open/close or trip switch
  useEffect(() => {
    if (isOpen && trip) {
      setIsSubmitting(false);
      setErrorMsg('');
      setIsCancelling(false);
      setCancelReason('');
    }
  }, [isOpen, trip]);

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

  if (!isOpen || !trip) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // PII masking for view-only roles
  const displayPhone = (phone) => {
    if (!phone) return '—';
    if (canManageTrips) return phone;
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  // Advance lifecycle state (PRD A-07)
  const handleProgressStatus = async (nextStatus) => {
    setErrorMsg('');
    if (!canManageTrips) {
      setErrorMsg('You do not have administrative permission to modify trip lifecycle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateTripStatus(trip.tripId, nextStatus);
      onStatusUpdated(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update trip status.');
      setIsSubmitting(false);
    }
  };

  // Cancel trip handler
  const handleConfirmCancel = async () => {
    setErrorMsg('');
    const trimmed = cancelReason.trim();

    if (!trimmed) {
      setErrorMsg('A cancellation reason is required to cancel this trip.');
      return;
    }

    if (!canManageTrips) {
      setErrorMsg('You do not have administrative permission to cancel trips.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateTripStatus(trip.tripId, 'CANCELLED', { cancelReason: trimmed });
      onStatusUpdated(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel trip.');
      setIsSubmitting(false);
    }
  };

  const isTerminal = trip.tripStatus === 'COMPLETED' || trip.tripStatus === 'CANCELLED';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-details-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '680px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          maxHeight: '92vh'
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Navigation size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  id="trip-details-title"
                  style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}
                >
                  Trip #TRP-{trip.tripId}
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background:
                      trip.tripStatus === 'COMPLETED'
                        ? '#f0fdf4'
                        : trip.tripStatus === 'CANCELLED'
                        ? '#fef2f2'
                        : '#eff6ff',
                    color:
                      trip.tripStatus === 'COMPLETED'
                        ? '#15803d'
                        : trip.tripStatus === 'CANCELLED'
                        ? '#b91c1c'
                        : '#1d4ed8',
                    border: '1px solid var(--border)'
                  }}
                >
                  {trip.tripStatus}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Order #{trip.orderId} • {trip.companyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            style={{ padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Error Banner */}
          {errorMsg && (
            <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cancellation Reason Banner if Cancelled */}
          {trip.tripStatus === 'CANCELLED' && trip.cancelReason && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1rem',
                color: '#991b1b',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8125rem' }}>
                <XCircle size={15} />
                <span>Trip Cancelled</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78125rem' }}>
                <strong>Reason:</strong> {trip.cancelReason}
              </p>
            </div>
          )}

          {/* OTP & Security Verification Card */}
          {trip.otp && trip.tripStatus !== 'CANCELLED' && (
            <div
              style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <KeyRound size={20} style={{ color: '#7c3aed' }} />
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>
                    Trip Start Security OTP (PRD A-06)
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Share this code with passenger to initiate ride
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: trip.tripStatus === 'COMPLETED' ? '0.95rem' : '1.35rem',
                  fontWeight: 800,
                  letterSpacing: trip.tripStatus === 'COMPLETED' ? '1px' : '4px',
                  color: trip.tripStatus === 'COMPLETED' ? '#15803d' : '#6A379F',
                  background: '#ffffff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: trip.tripStatus === 'COMPLETED' ? '1px solid #bbf7d0' : '1px solid #d8b4fe'
                }}
              >
                {trip.tripStatus === 'COMPLETED'
                  ? 'VERIFIED'
                  : canManageTrips
                  ? trip.otp
                  : '••••••'}
              </div>
            </div>
          )}

          {/* Visual Journey Route Card */}
          <div
            style={{
              background: 'var(--background)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
              Journey Route & Schedule
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                <MapPin size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pickup Location</div>
                  <div style={{ fontWeight: 500 }}>{trip.pickupSpot}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Dropoff Destination</div>
                  <div style={{ fontWeight: 500 }}>{trip.dropoffSpot}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Scheduled: <strong>{new Date(trip.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(trip.pickupTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong></span>
              <span>Vehicle Class: <strong>{trip.vehicleType}</strong></span>
            </div>
          </div>

          {/* Assigned Driver Card */}
          {trip.driverId ? (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}
                >
                  {trip.driverName ? trip.driverName.charAt(0) : 'D'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {trip.driverName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <Phone size={11} />
                    <span>{displayPhone(trip.driverPhone)}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{trip.vehicleNumber}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Check size={11} />
                  <span>Driver Verified</span>
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem'
              }}
            >
              <AlertCircle size={16} />
              <span>No driver allocated yet. This trip requires driver assignment before pickup.</span>
            </div>
          )}

          {/* Passenger & Corporate Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              background: 'var(--background)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Passenger Information
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                {trip.passengerName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {displayPhone(trip.passengerPhone)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Corporate Client Account
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                {trip.companyName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Agreed Split: {trip.driverSplit}% Driver / {trip.hiredSplit}% Platform
              </div>
            </div>
          </div>

          {/* Financial Settlement Breakdown */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.875rem 1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              textAlign: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Fare</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>₹{Number(trip.amount).toFixed(2)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Driver Earning ({trip.driverSplit}%)</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#15803d' }}>₹{Number(trip.driverEarning || 0).toFixed(2)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#6A379F', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Platform Fee ({trip.hiredSplit}%)</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#6A379F' }}>₹{Number(trip.platformCommission || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Inline Cancellation Drawer */}
          {isCancelling && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 600, fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={15} />
                  <span>Specify cancellation reason (mandatory for audit):</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 500 }}>
                  {500 - cancelReason.length} characters left
                </span>
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Passenger cancelled booking, vehicle breakdown, driver emergency..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #fca5a5',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  resize: 'none',
                  background: '#ffffff'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCancelling(false)}
                  disabled={isSubmitting}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmCancel}
                  disabled={isSubmitting || !canManageTrips}
                  id="confirm-cancel-trip-btn"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer with Lifecycle Controls (PRD A-07) ── */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-subtle, #f8fafc)'
          }}
        >
          {/* Left: Cancel Trip button if not terminal and not already cancelling */}
          {!isTerminal && !isCancelling ? (
            <button
              type="button"
              className="btn-danger-ghost"
              onClick={() => setIsCancelling(true)}
              disabled={isSubmitting || !canManageTrips}
              id="initiate-cancel-trip-btn"
              style={{
                fontSize: '0.78125rem',
                padding: '0.45rem 0.85rem',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                background: '#fff',
                borderRadius: '4px',
                cursor: canManageTrips ? 'pointer' : 'not-allowed'
              }}
            >
              Cancel Trip
            </button>
          ) : (
            <div />
          )}

          {/* Right: State Progression Controls */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
            >
              Close
            </button>

            {/* Lifecycle Triggers */}
            {canManageTrips && !isTerminal && (
              <>
                {trip.tripStatus === 'DRIVER_ASSIGNED' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleProgressStatus('DRIVER_ARRIVED')}
                    disabled={isSubmitting}
                    id="mark-driver-arrived-btn"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.5rem 1.25rem',
                      background: '#2563eb',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <MapPin size={14} />
                    <span>{isSubmitting ? 'Updating...' : 'Mark Driver Arrived'}</span>
                  </button>
                )}

                {trip.tripStatus === 'DRIVER_ARRIVED' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleProgressStatus('IN_TRANSIT')}
                    disabled={isSubmitting}
                    id="start-trip-btn"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.5rem 1.25rem',
                      background: '#7c3aed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Navigation size={14} />
                    <span>{isSubmitting ? 'Starting...' : 'Start Trip (In Transit)'}</span>
                  </button>
                )}

                {trip.tripStatus === 'IN_TRANSIT' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleProgressStatus('COMPLETED')}
                    disabled={isSubmitting}
                    id="complete-trip-btn"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.5rem 1.25rem',
                      background: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isSubmitting ? 'Completing...' : 'Complete Trip'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
