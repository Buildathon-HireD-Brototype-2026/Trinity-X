import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Car,
  MapPin,
  Calendar,
  Building2,
  RotateCcw,
  Send,
  Lock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getEligibleDrivers } from './orderService';

/**
 * Format timestamp into readable localized date and time string
 */
function formatTripDateTime(dateStr) {
  if (!dateStr) return 'Scheduled Date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Default Accept Email Body Template
 */
function generateDefaultAcceptBody(order, driverName) {
  const companyName = order?.company?.name || order?.companyName || (typeof order?.company === 'string' ? order.company : 'Corporate Client');
  const pickup = order?.pickupSpot || order?.pickup || 'N/A';
  const drop = order?.dropoffSpot || order?.dropoff || 'N/A';
  const time = formatTripDateTime(order?.pickupTime || order?.scheduledDate);
  const driver = driverName ? driverName.trim() : '[Driver to be assigned]';

  return `Dear ${companyName},

Your booking request for Order #${order?.orderId || order?.id} has been accepted and confirmed.

Trip Details:
• Order ID: #${order?.orderId || order?.id}
• Pickup Location: ${pickup}
• Drop-off Location: ${drop}
• Scheduled Date & Time: ${time}
• Assigned Driver: ${driver}

Thank you for choosing HireD Corporate Mobility. Your assigned driver will arrive promptly at the scheduled pickup location.

Warm regards,
HireD Operations Desk`;
}

/**
 * Default Reject Email Body Template
 */
function generateDefaultRejectBody(order, reason) {
  const companyName = order?.company?.name || order?.companyName || (typeof order?.company === 'string' ? order.company : 'Corporate Client');
  const pickup = order?.pickupSpot || order?.pickup || 'N/A';
  const drop = order?.dropoffSpot || order?.dropoff || 'N/A';
  const time = formatTripDateTime(order?.pickupTime || order?.scheduledDate);
  const rejectionReason = reason ? reason.trim() : '[No reason specified]';

  return `Dear ${companyName},

We regret to inform you that your booking request for Order #${order?.orderId || order?.id} could not be accepted.

Trip Details:
• Order ID: #${order?.orderId || order?.id}
• Pickup Location: ${pickup}
• Drop-off Location: ${drop}
• Scheduled Date & Time: ${time}
• Reason for Rejection: ${rejectionReason}

We apologize for any inconvenience caused. Please feel free to submit a revised request or contact our operations room for immediate assistance.

Warm regards,
HireD Operations Desk`;
}

export default function OrderDecisionEmailModal({
  isOpen,
  mode = 'ACCEPT', // 'ACCEPT' | 'REJECT'
  order,
  adminEmail = 'admin@hired.com',
  onClose,
  onSend,
  onSwitchMode,
  isSubmitting = false
}) {
  const isAccept = mode === 'ACCEPT';

  // Recipient resolution: strictly the company that placed the order
  const companyEmail = useMemo(() => {
    if (!order) return '';
    return order.company?.email || order.companyEmail || order.company?.emailId || '';
  }, [order]);

  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [driverFetchError, setDriverFetchError] = useState('');
  const [driverName, setDriverName] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isBodyEdited, setIsBodyEdited] = useState(false);
  const [validationError, setValidationError] = useState('');

  const orderId = order?.orderId || order?.id;
  const orderDate = order?.pickupTime || order?.scheduledDate;
  const orderDateDisplay = useMemo(() => {
    return formatTripDateTime(orderDate);
  }, [orderDate]);

  // Fetch eligible drivers available for this order's scheduled date
  const loadEligibleDrivers = useCallback(() => {
    if (!isOpen || !isAccept || !order) return;
    setIsLoadingDrivers(true);
    setDriverFetchError('');

    getEligibleDrivers(orderId, orderDate)
      .then((drivers) => {
        setIsLoadingDrivers(false);
        if (Array.isArray(drivers)) {
          setAvailableDrivers(drivers);
          // If previously chosen driver is not eligible, clear it
          setDriverName((prev) => {
            if (prev && !drivers.some((d) => d.name === prev)) {
              return '';
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        setIsLoadingDrivers(false);
        setDriverFetchError(err.message || 'Failed to fetch eligible drivers for this date.');
      });
  }, [isOpen, isAccept, order, orderId, orderDate]);

  useEffect(() => {
    if (isOpen && isAccept) {
      loadEligibleDrivers();
    }
  }, [isOpen, isAccept, loadEligibleDrivers]);

  // Initialize or reset form state whenever order or mode changes
  useEffect(() => {
    if (isOpen && order) {
      const initialDriver = order.driverName || order.driver || '';
      const initialReason = order.rejectReason || '';
      setDriverName(initialDriver);
      setRejectReason(initialReason);
      setValidationError('');
      setIsBodyEdited(false);

      if (isAccept) {
        setSubject(`Order #${orderId} Accepted`);
        setBody(generateDefaultAcceptBody(order, initialDriver));
      } else {
        setSubject(`Order #${orderId} Rejected`);
        setBody(generateDefaultRejectBody(order, initialReason));
      }
    }
  }, [isOpen, order, mode, isAccept, orderId]);

  // Handle ESC key to dismiss without mutating order
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // ── Validation & Send ─────────────────────────────────────────────────────
  const canSend = useMemo(() => {
    if (!companyEmail) return false;
    if (isAccept) {
      if (isLoadingDrivers) return false;
      if (availableDrivers.length === 0) return false; // Block Accept if no drivers available!
      return Boolean(driverName && driverName.trim());
    } else {
      return Boolean(rejectReason && rejectReason.trim());
    }
  }, [companyEmail, isAccept, isLoadingDrivers, availableDrivers.length, driverName, rejectReason]);

  if (!isOpen || !order) return null;

  // ── Change Handlers with Live Update Logic ────────────────────────────────
  const handleDriverChange = (val) => {
    setDriverName(val);
    if (validationError) setValidationError('');
    // Live update body until manually edited
    if (!isBodyEdited) {
      setBody(generateDefaultAcceptBody(order, val));
    }
  };

  const handleReasonChange = (val) => {
    setRejectReason(val);
    if (validationError) setValidationError('');
    // Live update body until manually edited
    if (!isBodyEdited) {
      setBody(generateDefaultRejectBody(order, val));
    }
  };

  const handleBodyChange = (e) => {
    setBody(e.target.value);
    setIsBodyEdited(true);
  };

  const handleResetBody = () => {
    setIsBodyEdited(false);
    if (isAccept) {
      setBody(generateDefaultAcceptBody(order, driverName));
    } else {
      setBody(generateDefaultRejectBody(order, rejectReason));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (isAccept) {
      if (!driverName || !driverName.trim()) {
        setValidationError('Driver name is required.');
        return;
      }
    } else {
      if (!rejectReason || !rejectReason.trim()) {
        setValidationError('Rejection reason is required.');
        return;
      }
    }

    if (!companyEmail) {
      setValidationError('Company email missing, add it before sending.');
      return;
    }

    onSend({
      orderId: order.orderId,
      mode,
      driverName: driverName.trim(),
      rejectReason: rejectReason.trim(),
      subject: subject.trim(),
      body: body.trim(),
      from: adminEmail,
      to: companyEmail
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-decision-title"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999
      }}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '640px',
          width: '100%',
          background: 'var(--surface, #ffffff)',
          borderRadius: 'var(--radius, 8px)',
          border: '1px solid var(--border, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* ── Dialog Header ── */}
        <div
          style={{
            padding: '1.125rem 1.5rem',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--background, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: isAccept ? '#dcfce7' : '#fee2e2',
                color: isAccept ? '#16a34a' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isAccept ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <div>
              <h3
                id="order-decision-title"
                style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}
              >
                {isAccept ? `Accept Order #${order.orderId}` : `Reject Order #${order.orderId}`}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                {isAccept
                  ? 'Assign an executive driver and review the corporate booking confirmation email.'
                  : 'Specify the operational rejection reason and review the decline notice email.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            style={{
              padding: '0.35rem',
              borderRadius: '4px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Dialog Scrollable Body ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.125rem',
            flex: 1
          }}
        >
          {/* Missing Company Email Alert Banner */}
          {!companyEmail && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>Company email missing, add it before sending</span>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div
              role="alert"
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* ── ACCEPT FLOW: Driver Selection ── */}
          {isAccept && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="decision-driver-select"
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #0f172a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Car size={14} style={{ color: '#16a34a' }} />
                  <span>Eligible Driver <span style={{ color: '#dc2626' }}>*</span></span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
                    For {orderDateDisplay}
                  </span>
                  <button
                    type="button"
                    onClick={loadEligibleDrivers}
                    disabled={isLoadingDrivers || isSubmitting}
                    className="btn-ghost"
                    title="Refresh eligible drivers"
                    style={{
                      padding: '0.2rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary, #6A379F)'
                    }}
                  >
                    <RefreshCw size={12} className={isLoadingDrivers ? 'spin-animation' : ''} />
                  </button>
                </div>
              </div>

              {/* 1. Loading State */}
              {isLoadingDrivers && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#475569'
                  }}
                >
                  <Loader2 size={16} className="spin-animation" style={{ color: 'var(--primary, #6A379F)' }} />
                  <span>Checking driver availability for {orderDateDisplay}...</span>
                </div>
              )}

              {/* 2. Driver Fetch Error Banner */}
              {!isLoadingDrivers && driverFetchError && (
                <div
                  role="alert"
                  style={{
                    padding: '0.625rem 0.875rem',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{driverFetchError}</span>
                  <button
                    type="button"
                    onClick={loadEligibleDrivers}
                    style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* 3. Empty State: No Drivers Available */}
              {!isLoadingDrivers && !driverFetchError && availableDrivers.length === 0 && (
                <div
                  role="alert"
                  className="orders-empty-state-banner"
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.8125rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>No drivers available on {orderDateDisplay}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                    All active drivers have approved leave or scheduled trip commitments on this date. Assign/Accept is disabled.
                  </p>
                  {onSwitchMode && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => onSwitchMode('REJECT')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        The admin can still Reject this order →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Eligible Drivers Dropdown */}
              {!isLoadingDrivers && availableDrivers.length > 0 && (
                <div>
                  <select
                    id="decision-driver-select"
                    className="admin-input"
                    value={driverName}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '38px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderColor: !driverName.trim() && validationError ? '#dc2626' : undefined
                    }}
                  >
                    <option value="">-- Select Available Eligible Driver ({availableDrivers.length} Available) --</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.id}{d.phone_no ? ` • ${d.phone_no}` : ''})
                      </option>
                    ))}
                  </select>

                  {!driverName.trim() && (
                    <span style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '0.25rem', display: 'block' }}>
                      Please select an available driver before sending confirmation.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── REJECT FLOW: Rejection Reason ── */}
          {!isAccept && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="decision-reject-reason-input"
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <AlertCircle size={14} style={{ color: '#dc2626' }} />
                  <span>Rejection Reason <span style={{ color: '#dc2626' }}>*</span></span>
                </label>
                <span style={{ fontSize: '0.72rem', color: '#991b1b' }}>
                  Mandatory operational rationale
                </span>
              </div>

              <textarea
                id="decision-reject-reason-input"
                rows={2}
                maxLength={500}
                value={rejectReason}
                onChange={(e) => handleReasonChange(e.target.value)}
                placeholder="e.g. No drivers available for requested time window, destination outside operational perimeter..."
                className="admin-input"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  fontSize: '0.8125rem',
                  resize: 'none',
                  borderColor: !rejectReason.trim() && validationError ? '#dc2626' : '#fca5a5',
                  background: '#ffffff'
                }}
              />

              {!rejectReason.trim() ? (
                <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 500 }}>
                  Rejection reason is required. Send is blocked while empty.
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'right' }}>
                  {500 - rejectReason.length} characters left
                </span>
              )}
            </div>
          )}

          {/* ── SECTION 4: EMAIL NOTIFICATION SECTION ── */}
          <div
            style={{
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '6px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
              background: '#ffffff'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                <Mail size={15} style={{ color: 'var(--primary, #6A379F)' }} />
                <span>EMAIL REVIEW & TRANSMISSION</span>
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: 'var(--text-muted, #64748b)',
                  fontWeight: 600
                }}
              >
                Manual Admin Review
              </span>
            </div>

            {/* Read-only From and To fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted, #64748b)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  <Lock size={11} />
                  <span>From (Admin Sender)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={adminEmail}
                  className="admin-input"
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.8125rem',
                    cursor: 'not-allowed',
                    height: '34px'
                  }}
                  title="Configured administrator sender email (read-only)"
                  id="email-field-from"
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted, #64748b)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  <Lock size={11} />
                  <span>To (Corporate Client)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={companyEmail || 'Missing company email'}
                  className="admin-input"
                  style={{
                    background: !companyEmail ? '#fee2e2' : '#f8fafc',
                    color: !companyEmail ? '#b91c1c' : '#475569',
                    fontSize: '0.8125rem',
                    cursor: 'not-allowed',
                    height: '34px',
                    borderColor: !companyEmail ? '#fca5a5' : undefined
                  }}
                  title="Registered corporate company recipient email (read-only)"
                  id="email-field-to"
                />
              </div>
            </div>

            {/* Editable Subject Field */}
            <div>
              <label
                htmlFor="decision-email-subject"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #0f172a)',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Subject
              </label>
              <input
                id="decision-email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
                className="admin-input"
                style={{
                  width: '100%',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  height: '36px'
                }}
              />
            </div>

            {/* Editable Message Body */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <label
                  htmlFor="decision-email-body"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-main, #0f172a)'
                  }}
                >
                  Message Body
                </label>
                {isBodyEdited ? (
                  <button
                    type="button"
                    onClick={handleResetBody}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary, #6A379F)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: 0
                    }}
                    id="reset-body-link"
                  >
                    <RotateCcw size={11} />
                    <span>Reset to default</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 500 }}>
                    Auto-syncing with order details
                  </span>
                )}
              </div>

              <textarea
                id="decision-email-body"
                rows={7}
                value={body}
                onChange={handleBodyChange}
                disabled={isSubmitting}
                className="admin-input"
                style={{
                  width: '100%',
                  fontSize: '0.8125rem',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  padding: '0.65rem'
                }}
              />
            </div>
          </div>
        </form>

        {/* ── Dialog Footer Controls ── */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--background, #f8fafc)'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSend}
            className={isAccept ? 'btn-primary' : 'btn-danger'}
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: isAccept ? (!canSend ? '#94a3b8' : '#16a34a') : (!canSend ? '#94a3b8' : '#dc2626'),
              borderColor: isAccept ? (!canSend ? '#94a3b8' : '#16a34a') : (!canSend ? '#94a3b8' : '#dc2626'),
              cursor: canSend && !isSubmitting ? 'pointer' : 'not-allowed'
            }}
            id="order-decision-send-btn"
          >
            <Send size={14} className={isSubmitting ? 'spin-animation' : ''} />
            <span>
              {isSubmitting ? 'Sending...' : 'Send'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
