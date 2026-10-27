import React from 'react';
import { Eye, Send, CheckCircle2, Clock, AlertTriangle, FileCheck2, Building2 } from 'lucide-react';

export default function InvoiceTable({ invoices = [], onReview, onSend }) {
  if (!invoices.length) {
    return (
      <div
        className="card"
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary, #6b7280)',
        }}
      >
        <Building2 size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
        <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary, #111827)' }}>
          No Monthly Statements Found
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>
          Try clearing filters or generate a new statement for this billing cycle.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (invoice) => {
    switch (invoice.status) {
      case 'SENT':
        return (
          <span
            className="status-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#f3e8ff',
              color: '#7e22ce',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            <Send size={12} /> Dispatched to Client
          </span>
        );
      case 'VERIFIED':
        return (
          <span
            className="status-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            <CheckCircle2 size={12} /> Verified (2/2)
          </span>
        );
      case 'PENDING_APPROVAL_2':
        return (
          <span
            className="status-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            <Clock size={12} /> Needs 2nd Admin Sign-Off
          </span>
        );
      case 'PENDING_APPROVAL_1':
      default:
        return (
          <span
            className="status-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            <Clock size={12} /> Needs 1st Approval
          </span>
        );
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-muted, #f9fafb)',
                borderBottom: '1px solid var(--border-color, #e5e7eb)',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600 }}>Statement ID</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600 }}>B2B Company & Email</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600 }}>Billing Period</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600, textAlign: 'center' }}>Trips</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600, textAlign: 'right' }}>Total Amount</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600 }}>Verification Status</th>
              <th style={{ padding: '0.75rem 1rem', color: '#4b5563', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const canSend = inv.status === 'VERIFIED' || inv.status === 'SENT';

              return (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: '1px solid var(--border-color, #e5e7eb)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary, #111827)' }}>
                    #{inv.id}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary, #111827)' }}>{inv.companyName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #6b7280)' }}>{inv.companyEmail}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary, #4b5563)' }}>
                    {inv.billingPeriod}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                    {inv.tripCount}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                    ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {renderStatusBadge(inv)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className="btn-review-invoice"
                        onClick={() => onReview(inv)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                        title="Review trip breakdowns & verify approvals"
                      >
                        <Eye size={14} /> Review
                      </button>

                      <button
                        className="btn-send-invoice"
                        disabled={!canSend}
                        onClick={() => onSend(inv)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: canSend ? '#2563eb' : '#e5e7eb',
                          color: canSend ? '#ffffff' : '#9ca3af',
                          cursor: canSend ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                        title={
                          !canSend
                            ? 'Cannot dispatch to client: Two-person verification required'
                            : inv.status === 'SENT'
                            ? 'Resend or view email receipt'
                            : 'Send invoice to B2B company email'
                        }
                      >
                        <Send size={14} /> {inv.status === 'SENT' ? 'Resend' : 'Send'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
