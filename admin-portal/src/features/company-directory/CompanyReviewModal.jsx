import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function CompanyReviewModal({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  canManageCompanies = true
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setIsRejecting(false);
      setRejectReason('');
      setIsSubmitting(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !request) return null;

  const isPending = request.status === 'PENDING';

  // PII phone masking for view-only / auditor sessions
  const displayPhone = () => {
    if (!request.phoneNo) return '—';
    if (canManageCompanies) return request.phoneNo;
    const parts = request.phoneNo.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return request.phoneNo.slice(0, 7) + '•••••';
  };

  const handleApproveClick = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onApprove(request.requestId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve registration request.');
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMsg('Please specify a reason for rejecting this registration request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onReject(request.requestId, rejectReason.trim());
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject registration request.');
      setIsSubmitting(false);
    }
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
      aria-labelledby="company-review-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '640px',
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
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  id="company-review-title"
                  style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-main)' }}
                >
                  {request.companyName}
                </h2>
                <span
                  className="badge badge-amber"
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {request.status}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Registration Request #{request.requestId} • Submitted {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Content ── */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.125rem'
          }}
        >
          {/* PRD Rule Callout Banner */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              fontSize: '0.8125rem',
              color: 'var(--primary)'
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Approving this corporate registration request immediately provisions an active client account in the directory, assigns default payout splits, and authorizes the enterprise for transport dispatch.
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.875rem',
              background: 'var(--background)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                CONTACT PERSON
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem', display: 'block' }}>
                {request.contactPerson}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                CORPORATE EMAIL
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                {request.emailId}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                CONTACT PHONE
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                {displayPhone()}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                BASE LOCATION / HUB
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                {request.companyLocation || 'Bengaluru'}
              </span>
            </div>
          </div>

          {/* Full Corporate Address */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              OFFICIAL REGISTERED ADDRESS
            </span>
            <div
              style={{
                padding: '0.625rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)'
              }}
            >
              {request.address || request.companyLocation || 'Bengaluru, Karnataka'}
            </div>
          </div>

          {/* Application Notes / Transport Requirements */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              FLEET REQUIREMENTS / APPLICATION NOTES
            </span>
            <div
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                fontStyle: request.notes ? 'normal' : 'italic'
              }}
            >
              {request.notes || 'No custom fleet requirements specified by applicant.'}
            </div>
          </div>

          {/* Rejection input box if activated */}
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
                  <span>Specify reason for rejection:</span>
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
                placeholder="e.g. Unverified corporate registration, duplicate account, or service unavailable in zone..."
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
                  onClick={() => setIsRejecting(false)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmReject}
                  disabled={isSubmitting || !canManageCompanies}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
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
            {!canManageCompanies && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                View-only mode (Admin privileges required to approve or reject).
              </span>
            )}

            {canManageCompanies && isPending && !isRejecting && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting}
                style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5' }}
              >
                <XCircle size={14} />
                <span>Reject</span>
              </button>
            )}

            {canManageCompanies && isPending && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleApproveClick}
                disabled={isSubmitting}
                id="modal-approve-company-btn"
              >
                <CheckCircle2 size={15} />
                <span>{isSubmitting ? 'Approving...' : 'Approve & Onboard'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
