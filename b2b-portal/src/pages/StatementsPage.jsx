import React, { useState, useEffect } from 'react';
import statementService from '../services/statementService';
import StatementDetailModal from '../components/statements/StatementDetailModal';
import { StatusBadge } from '../components/common/StatusBadge';
import useTableSubscription from '../hooks/useTableSubscription';
import { PageErrorState } from '../components/common/PageErrorState';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import {
  Receipt,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Eye,
  Info,
  CreditCard,
  FileText,
} from 'lucide-react';

export function StatementsPage() {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatement, setSelectedStatement] = useState(null);

  const fetchStatements = async (isQuiet = false) => {
    if (!isQuiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await statementService.getPublishedStatements();
      setStatements(data || []);
      setError(null);
    } catch (err) {
      if (!isQuiet) {
        setError(getFriendlyErrorMessage(err, 'statements'));
      }
    } finally {
      if (!isQuiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  // Real-time automatic subscription to database changes on invoices
  useTableSubscription(['invoices'], () => {
    fetchStatements(true);
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Month-End Statements</h1>
          <p className="page-subtitle">
            Consolidated monthly billing statements viewable exclusively after two-person administrator verification.
          </p>
        </div>
      </div>

      {/* Two-Person Verification Policy Notice */}
      <div className="notice-box notice-info">
        <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Two-Person Verification Integrity:</strong> Statements undergo strict multi-admin review before release.
          Only invoices that have received sign-off from both the statement creator and a secondary platform controller appear in this portal with status <span className="status-badge status-published">Published</span>. Unverified or draft invoices are strictly prohibited from partner view.
        </div>
      </div>

      {/* Statements Table or Error State */}
      {error && statements.length === 0 ? (
        <PageErrorState message={error} onRetry={() => fetchStatements(false)} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Statement #</th>
                  <th>Billing Period</th>
                  <th>Closed Trips</th>
                  <th style={{ textAlign: 'right' }}>Total Gross Fare</th>
                  <th style={{ textAlign: 'right' }}>Net Payable</th>
                  <th>Verification Check</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading verified statements...
                    </td>
                  </tr>
                ) : statements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                        No statements yet
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Statements are generated at month-end and published following completion of the two-person verification process.
                      </p>
                    </td>
                  </tr>
                ) : (
                statements.map((stmt) => (
                  <tr key={stmt.invoice_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {stmt.invoice_number || `INV-${stmt.invoice_id}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Published {new Date(stmt.published_at || stmt.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={15} color="var(--text-secondary)" />
                        <span>{stmt.period_month}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>{stmt.total_trips} trips</div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(stmt.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      ₹{Number(stmt.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <CheckCircle2 size={15} />
                        <span>2-Admin Verified</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {stmt.payment_status === 'PAID' ? '• Settled' : '• Pending Settlement'}
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={stmt.status} />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                        onClick={() => setSelectedStatement(stmt)}
                        title="Inspect Statement Details"
                      >
                        <Eye size={15} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Statement Detail Modal */}
      {selectedStatement && (
        <StatementDetailModal
          statement={selectedStatement}
          onClose={() => setSelectedStatement(null)}
        />
      )}
    </div>
  );
}

export default StatementsPage;
