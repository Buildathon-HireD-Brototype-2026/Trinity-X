import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Info,
  CreditCard,
  Receipt,
  FileText,
} from 'lucide-react';

export function StatementDetailModal({ statement, onClose }) {
  if (!statement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2.5rem',
          backgroundColor: 'var(--bg-surface)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>
            <ShieldCheck size={20} />
            <span>Verified Month-End Statement (PRD B-06)</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.8rem' }}
            >
              <Printer size={15} />
              <span>Print Statement</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div id="printable-statement">
          {/* Statement Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <img src="/logo.svg" alt="HireD" style={{ height: '38px', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                HireD Enterprise Logistics Platform
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                GSTIN / Tax ID: 07AAACH1234F1Z8
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--primary)' }}>
                {statement.invoice_number || `INV-${statement.invoice_id}`}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                Billing Period: {statement.period_month}
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <StatusBadge status={statement.status} />
              </div>
            </div>
          </div>

          {/* Dual-Admin Verification Stamp */}
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#166534', fontWeight: 700, fontSize: '0.875rem' }}>
              <CheckCircle2 size={18} />
              <span>Two-Person Administrator Verification Completed</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8125rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>FIRST APPROVAL (CREATOR)</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{statement.verified_by_admin1}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {statement.verified_at1 ? new Date(statement.verified_at1).toLocaleString('en-IN') : 'Verified'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SECOND APPROVAL (CONTROLLER)</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{statement.verified_by_admin2}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {statement.verified_at2 ? new Date(statement.verified_at2).toLocaleString('en-IN') : 'Verified'}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              Monthly Consolidation Summary
            </h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Rate / Split Ratio</th>
                    <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Closed Trips (Fares)</td>
                    <td>{statement.total_trips} Trips</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(statement.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>Driver Allocated Share</td>
                    <td>{statement.driver_share_pct || 30.0}% (PRD 5.4)</td>
                    <td style={{ textAlign: 'right' }}>
                      ₹{Number(statement.driver_share_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>HireD Platform Share</td>
                    <td>{statement.platform_share_pct || 70.0}% (PRD 5.4)</td>
                    <td style={{ textAlign: 'right' }}>
                      ₹{Number(statement.platform_share_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>Reimbursable Driver Expenses</td>
                    <td>Tolls & Parking disbursements</td>
                    <td style={{ textAlign: 'right' }}>
                      ₹{Number(statement.expenses_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ background: '#FAF5FF', fontWeight: 800, fontSize: '1rem' }}>
                    <td colSpan={2}>Total Monthly Settlement Amount</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                      ₹{Number(statement.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Trip-wise Breakdown (PRD 5.4: trip-wise rates and monthly totals) */}
          {statement.trips && statement.trips.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Trip-wise Log
              </h4>
              <div className="table-container">
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Route Summary</th>
                      <th>Total Fare</th>
                      <th>Driver (30%)</th>
                      <th>Platform (70%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.trips.map((t) => (
                      <tr key={t.trip_id}>
                        <td style={{ fontWeight: 600 }}>TRIP-{t.trip_id}</td>
                        <td>{t.pickup_spot} ➔ {t.dropoff_spot}</td>
                        <td style={{ fontWeight: 600 }}>₹{t.amount.toFixed(2)}</td>
                        <td>₹{t.driver_share.toFixed(2)}</td>
                        <td>₹{t.platform_share.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Offline Settlement Terms Box (PRD Phase 1 requirement) */}
          <div className="notice-box notice-info" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Payment Terms & Offline Settlement:</strong>
              <div>{statement.settlement_terms}</div>
              <div style={{ marginTop: '0.35rem', color: '#1E40AF', fontSize: '0.75rem' }}>
                Bank: HDFC Bank Ltd | A/C: 50200012345678 | IFSC: HDFC0000240 | Beneficiary: HireD Logistics Pvt Ltd
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatementDetailModal;
