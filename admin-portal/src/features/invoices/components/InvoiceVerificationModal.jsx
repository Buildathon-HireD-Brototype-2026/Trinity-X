import { getFriendlyError } from '../../../utils/friendlyError';
import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, AlertCircle, FileText, Send, UserCheck, Calendar, IndianRupee } from 'lucide-react';

export default function InvoiceVerificationModal({
  invoice,
  isOpen,
  onClose,
  onApproveFirst,
  onApproveSecond,
  onOpenSendModal,
  currentAdmin,
}) {
  if (!isOpen || !invoice) return null;

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasFirstApproval = Boolean(invoice.firstApproval);
  const hasSecondApproval = Boolean(invoice.secondApproval);
  const isVerified = invoice.status === 'VERIFIED' || invoice.status === 'SENT';

  // Check if current logged-in admin is the same as the first approver
  const currentEmail = (currentAdmin?.email || currentAdmin?.emailId || '').toLowerCase().trim();
  const currentId = String(currentAdmin?.id || currentAdmin?.adminId || '');
  const firstEmail = (invoice.firstApproval?.email || invoice.firstApproval?.emailId || '').toLowerCase().trim();
  const firstId = String(invoice.firstApproval?.id || invoice.firstApproval?.adminId || '');

  const isFirstApprover =
    hasFirstApproval &&
    Boolean(
      (currentEmail && firstEmail && currentEmail === firstEmail) ||
      (currentId && firstId && currentId === firstId)
    );

  const handleFirstApproval = async () => {
    try {
      setLoading(true);
      setError(null);
      await onApproveFirst(invoice.id);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSecondApproval = async () => {
    try {
      setLoading(true);
      setError(null);
      await onApproveSecond(invoice.id);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1040,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          backgroundColor: 'var(--bg-surface, #ffffff)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-muted, #f9fafb)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                }}
              >
                STATEMENT
              </span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
                {invoice.id} — {invoice.companyName}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)' }}>
              Billing Period: <strong>{invoice.billingPeriod}</strong> • Due: <strong>{invoice.dueDate}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #6b7280)',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#b91c1c',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* PRD Two-Person Verification Track Box */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 600 }}>
                  Two-Person Month-End Verification Audit Trail
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isVerified ? '#dcfce7' : '#fef9c3',
                  color: isVerified ? '#15803d' : '#854d0e',
                }}
              >
                {isVerified ? 'VERIFICATION COMPLETE (2/2)' : hasFirstApproval ? '1/2 APPROVALS' : '0/2 APPROVALS'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {/* Creator Box */}
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  1. Statement Creator
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                  {invoice.creator?.name || 'Admin'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {invoice.creator?.email}
                </div>
              </div>

              {/* 1st Approval Box */}
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  2. First Admin Check
                </span>
                {hasFirstApproval ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> {invoice.firstApproval?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {invoice.firstApproval?.email}
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      id="first-approval-btn"
                      type="button"
                      disabled={loading}
                      onClick={handleFirstApproval}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Sign 1st Approval
                    </button>
                  </div>
                )}
              </div>

              {/* 2nd Approval Box */}
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  3. Second Admin Sign-Off
                </span>
                {hasSecondApproval ? (
                  <>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> {invoice.secondApproval?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {invoice.secondApproval?.email}
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      id="second-approval-btn"
                      type="button"
                      disabled={!hasFirstApproval || isFirstApprover || loading}
                      onClick={handleSecondApproval}
                      title={
                        !hasFirstApproval
                          ? 'First approval required first'
                          : isFirstApprover
                          ? 'PRD Rule: Cannot approve second time with the same admin account'
                          : 'Sign second approval'
                      }
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        backgroundColor: !hasFirstApproval || isFirstApprover ? '#d1d5db' : '#16a34a',
                        color: !hasFirstApproval || isFirstApprover ? '#6b7280' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: !hasFirstApproval || isFirstApprover ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Sign 2nd Approval
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isFirstApprover && !hasSecondApproval && (
              <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                ℹ️ You signed the first approval. Company compliance policy mandates that another active admin must provide the second approval.
              </p>
            )}
          </div>

          {/* Itemized Rides Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Included Rides & Trips ({invoice.lineItems?.length || 0})
            </h4>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#4b5563' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#4b5563' }}>Trip ID</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#4b5563' }}>Route</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#4b5563' }}>Fare</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: '#4b5563' }}>Company Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.lineItems || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{item.date}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>#{item.tripId}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{item.route}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>₹{item.fare}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{item.companyShare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Summary */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              maxWidth: '320px',
              marginLeft: 'auto',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: '#6b7280' }}>Trip Rides Subtotal:</span>
              <span>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: '#6b7280' }}>Platform Service Fee:</span>
              <span>₹{Number(invoice.platformFee).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Applicable GST (18%):</span>
              <span>₹{Number(invoice.taxAmount).toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid #d1d5db',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <span>Total Payable:</span>
              <span style={{ color: '#16a34a' }}>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-muted, #f9fafb)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Close
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              id="open-send-email-btn"
              type="button"
              disabled={!isVerified}
              onClick={() => {
                onClose();
                onOpenSendModal(invoice);
              }}
              title={
                !isVerified
                  ? 'Two-person verification must be completed before dispatching email'
                  : 'Send invoice to B2B company email'
              }
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !isVerified ? '#9ca3af' : '#2563eb',
                color: '#ffffff',
                cursor: !isVerified ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <Send size={16} />
              {invoice.status === 'SENT' ? 'View Email Dispatch Status' : 'Send Invoice to B2B Company'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
