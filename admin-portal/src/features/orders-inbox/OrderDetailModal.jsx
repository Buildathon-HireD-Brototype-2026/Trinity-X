import React, { useState, useEffect } from 'react';
import {
  X,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  ArrowRight,
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  FileText,
  DollarSign,
  Car,
  Globe,
  MessageSquare,
  ShieldCheck,
  Percent,
  Mail,
  Send
} from 'lucide-react';

export default function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onResendEmail,
  canManageOrders = false
}) {
  const [tripAmount, setTripAmount] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // Reset state when opening/closing modal or switching orders
  useEffect(() => {
    if (order && isOpen) {
      setTripAmount(order.tripAmount ? String(order.tripAmount) : String(order.estimatedFare || ''));
      setIsRejecting(false);
      setRejectReason('');
      setIsSubmitting(false);
      setErrorMsg('');
      setEmailSuccessMsg('');
    }
  }, [order, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !order) return null;

  const isPending = order.status === 'RECEIVED';
  const isAccepted = order.status === 'ACCEPTED';
  const isRejected = order.status === 'REJECTED';

  // PII phone masking for view-only roles
  const displayPhone = (phone) => {
    if (!phone) return '—';
    if (canManageOrders) return phone;
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // ── Accept Order Flow (PRD A-05) ──────────────────────────────────────────
  const handleAcceptClick = async () => {
    setErrorMsg('');
    const fare = Number(tripAmount);

    if (isNaN(fare) || fare <= 0 || fare > 500000) {
      setErrorMsg('Please enter a valid trip amount between ₹1.00 and ₹5,00,000.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAccept(order.orderId, fare);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to accept order.');
      setIsSubmitting(false);
    }
  };

  // ── Reject Order Flow (PRD A-05) ──────────────────────────────────────────
  const handleConfirmReject = async () => {
    setErrorMsg('');
    const trimmed = rejectReason.trim();

    if (!trimmed) {
      setErrorMsg('Please specify a rejection reason to notify the client company.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(order.orderId, trimmed);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
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
          maxHeight: '90vh'
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
            background: 'var(--background)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Inbox size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  id="order-detail-title"
                  style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}
                >
                  Order #{order.orderId}
                </h2>
                <span
                  className={`badge ${
                    isPending ? 'badge-amber' : isAccepted ? 'badge-green' : 'badge-gray'
                  }`}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}
                >
                  {isPending ? 'Pending Decision' : isAccepted ? 'Accepted & Converted' : 'Rejected'}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Channel: <strong>{order.source}</strong> • Booked{' '}
                {new Date(order.createdAt).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
            style={{ padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Error Banner */}
          {errorMsg && (
            <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Corporate Client & Passenger Info */}
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
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                CLIENT COMPANY
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Building2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {order.companyName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                  {order.companyEmail || `billing@${order.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem' }}>
                Corporate Account ID: CMP-{String(order.companyId).padStart(3, '0')}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                PASSENGER DETAILS
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {order.contactName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                  {displayPhone(order.contactPhone)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Journey & Schedule */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Journey Route & Vehicle Request
            </h4>
            <div
              style={{
                background: 'var(--background)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <div style={{ marginTop: '0.15rem', color: '#16a34a' }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    PICKUP LOCATION
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                    {order.pickupSpot}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <div style={{ marginTop: '0.15rem', color: '#ef4444' }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    DROPOFF DESTINATION
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                    {order.dropoffSpot}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginTop: '0.25rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>
                    Pickup:{' '}
                    <strong>
                      {new Date(order.pickupTime).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                  <Car size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>
                    Vehicle: <strong>{order.vehicleType}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Instructions */}
          {order.notes && (
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.35rem' }}>
                PASSENGER & DISPATCH NOTES
              </span>
              <div
                style={{
                  background: 'var(--background)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-main)',
                  lineHeight: '1.4'
                }}
              >
                {order.notes}
              </div>
            </div>
          )}

          {/* Section 4: Trip Pricing & Split Configuration (PRD A-05) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Trip Fare & Financials (PRD A-05)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Standard Split: 80% Driver / 20% Platform
              </span>
            </div>

            {isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label
                  htmlFor="confirm-trip-amount-input"
                  style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', fontWeight: 500 }}
                >
                  Confirm or Adjust Total Trip Fare (₹):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        fontWeight: 600
                      }}
                    >
                      ₹
                    </span>
                    <input
                      id="confirm-trip-amount-input"
                      type="number"
                      step="0.01"
                      min="1"
                      max="500000"
                      value={tripAmount}
                      onChange={(e) => setTripAmount(e.target.value)}
                      placeholder="e.g. 1200.00"
                      className="admin-input"
                      style={{ paddingLeft: '1.85rem', fontWeight: 700, fontSize: '0.95rem' }}
                      disabled={isSubmitting || !canManageOrders}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Editable until trip closes.
                  </span>
                </div>

                <div
                  style={{
                    marginTop: '0.625rem',
                    padding: '0.625rem 0.75rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#166534'
                  }}
                >
                  <Mail size={14} style={{ flexShrink: 0, color: '#15803d' }} />
                  <span>
                    <strong>Client Email Notification:</strong> Accepting this order will immediately dispatch an official confirmation email with trip fare (<strong>₹{tripAmount ? Number(tripAmount).toFixed(2) : Number(order.estimatedFare || 0).toFixed(2)}</strong>) and journey schedule to <strong>{order.companyEmail || 'the corporate client'}</strong>.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CONFIRMED FARE</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
                    ₹{order.tripAmount ? Number(order.tripAmount).toFixed(2) : Number(order.estimatedFare).toFixed(2)}
                  </span>
                </div>
                {order.decidedAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Decided on {new Date(order.decidedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Rejection Form (If activated) */}
          {isRejecting && (
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
                  <span>Specify reason for declining order (PRD B-07):</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 500 }}>
                  {500 - rejectReason.length} characters left
                </span>
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. No drivers available for requested time window, destination beyond operational perimeter..."
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

              <div
                style={{
                  padding: '0.45rem 0.65rem',
                  background: '#ffffff',
                  border: '1px solid #fecdd3',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.72rem',
                  color: '#9f1239'
                }}
              >
                <Mail size={13} style={{ flexShrink: 0, color: '#e11d48' }} />
                <span>
                  This rationale will be automatically emailed to <strong>{order.companyEmail || 'the corporate client'}</strong> upon confirmation.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsRejecting(false)}
                  disabled={isSubmitting}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmReject}
                  disabled={isSubmitting || !canManageOrders}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection & Dispatch Email'}
                </button>
              </div>
            </div>
          )}

          {/* Section 6: B2B Notification & Email Dispatch Status (Settled Orders) */}
          {(isAccepted || isRejected) && (
            <div
              style={{
                background: isAccepted ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isAccepted ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={15} style={{ color: isAccepted ? '#15803d' : '#b91c1c' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isAccepted ? '#15803d' : '#b91c1c' }}>
                    {isAccepted ? 'Corporate Booking Confirmation Email Dispatched' : 'Corporate Booking Decline Notice Dispatched'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: isAccepted ? '#dcfce7' : '#fee2e2',
                    color: isAccepted ? '#166534' : '#991b1b'
                  }}
                >
                  ✓ Dispatched
                </span>
              </div>

              <div style={{ fontSize: '0.78125rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <div>
                  <strong>Recipient:</strong> {order.emailSentTo || order.companyEmail || 'Client Company Email'}
                </div>
                <div>
                  <strong>Subject:</strong> {order.emailSubject || (isAccepted ? `[HireD] Booking Confirmed — Order #ORD-${order.orderId}` : `[HireD] Booking Declined — Order #ORD-${order.orderId}`)}
                </div>
                {order.emailDispatchedAt && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Sent on {new Date(order.emailDispatchedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {isRejected && order.rejectReason && (
                  <div style={{ marginTop: '0.35rem', padding: '0.4rem 0.6rem', background: '#ffffff', borderRadius: '4px', border: '1px solid #fca5a5', fontSize: '0.75rem', color: '#991b1b' }}>
                    <strong>Rejection Rationale Emailed:</strong> {order.rejectReason}
                  </div>
                )}
              </div>

              {canManageOrders && onResendEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.4rem', borderTop: `1px solid ${isAccepted ? '#dcfce7' : '#fed7d7'}` }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Need to notify the client again?
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      setIsResendingEmail(true);
                      setEmailSuccessMsg('');
                      try {
                        await onResendEmail(order.orderId);
                        setEmailSuccessMsg(`Email successfully re-sent to ${order.emailSentTo || order.companyEmail}!`);
                        setTimeout(() => setEmailSuccessMsg(''), 4000);
                      } catch (err) {
                        setErrorMsg(err.message || 'Failed to resend email');
                      } finally {
                        setIsResendingEmail(false);
                      }
                    }}
                    disabled={isResendingEmail}
                    style={{
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.6rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={11} className={isResendingEmail ? 'spin-animation' : ''} />
                    <span>{isResendingEmail ? 'Resending...' : 'Resend Email Notification'}</span>
                  </button>
                </div>
              )}

              {emailSuccessMsg && (
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600, textAlign: 'right' }}>
                  ✓ {emailSuccessMsg}
                </div>
              )}
            </div>
          )}

          {/* Display previously rejected reason if already rejected */}
          {isRejected && order.rejectReason && !order.emailDispatched && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem',
                color: '#991b1b',
                fontSize: '0.8125rem'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Rejection Reason:</div>
              <div>{order.rejectReason}</div>
            </div>
          )}
        </div>

        {/* ── Modal Footer Controls ── */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--background)'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>

          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            {!canManageOrders && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                View-only mode (Admin privileges required to accept or reject).
              </span>
            )}

            {canManageOrders && isPending && !isRejecting && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting}
                style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5' }}
              >
                <XCircle size={14} />
                <span>Reject Order</span>
              </button>
            )}

            {canManageOrders && isPending && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleAcceptClick}
                disabled={isSubmitting}
                id="modal-accept-order-btn"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                <CheckCircle2 size={15} />
                <span>{isSubmitting ? 'Converting to Trip...' : 'Accept & Convert to Trip'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
