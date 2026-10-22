import React from 'react';
import {
  X,
  Printer,
  FileCheck2,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck,
  Receipt,
  Car,
} from 'lucide-react';

export function TripReportViewModal({ report, onClose }) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const startTime = report.started_at ? new Date(report.started_at) : null;
  const closeTime = report.closed_at ? new Date(report.closed_at) : null;
  const durationMins = startTime && closeTime ? Math.round((closeTime - startTime) / 60000) : null;

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
          maxWidth: '680px',
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
            <FileCheck2 size={20} />
            <span>Official HireD Closed Trip Report</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.8rem' }}
            >
              <Printer size={15} />
              <span>Print / PDF</span>
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

        {/* Printable Document Area */}
        <div id="printable-trip-report">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <img src="/logo.png" alt="HireD" style={{ height: '36px', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                B2B Commercial Transport Logistics
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                TRIP #{report.trip_id}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Linked Order: ORD-{report.order_id}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Closed: {closeTime ? closeTime.toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Route & Times */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PICKUP LOCATION</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{report.pickup_spot}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <MapPin size={18} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DROP-OFF LOCATION</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{report.dropoff_spot}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.875rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STARTED AT</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {startTime ? startTime.toLocaleTimeString('en-IN', { timeStyle: 'short' }) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CLOSED AT</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {closeTime ? closeTime.toLocaleTimeString('en-IN', { timeStyle: 'short' }) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL DURATION</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                  {durationMins ? `${durationMins} minutes` : 'Completed'}
                </div>
              </div>
            </div>
          </div>

          {/* Driver & Passenger Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                ASSIGNED DRIVER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <User size={16} color="var(--primary)" />
                <span>{report.driver_name || 'HireD Commercial Driver'}</span>
              </div>
              {report.driver_phone && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {report.driver_phone}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                PASSENGER / CONTACT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <User size={16} color="var(--text-secondary)" />
                <span>{report.contact_name}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {report.contact_phone}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              Financial Breakdown & Expenses
            </h4>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Transport Service Base Fare</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trip Rate</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(report.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {report.expenses.length > 0 ? (
                    report.expenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td>{exp.description}</td>
                        <td><span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>Disbursement</span></td>
                        <td style={{ textAlign: 'right' }}>₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No out-of-pocket expenses logged for this trip.
                      </td>
                      <td style={{ textAlign: 'right' }}>₹0.00</td>
                    </tr>
                  )}

                  <tr style={{ background: '#FAF5FF', fontWeight: 700, fontSize: '0.9375rem' }}>
                    <td colSpan={2}>Total Amount Incurred</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                      ₹{Number(report.total_spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Regulatory / Statement Notice */}
          <div className="notice-box notice-info" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Billing Note:</strong> Trip charges are consolidated at the end of each calendar month. Complete itemized statements are published only following mandatory two-administrator verification.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripReportViewModal;
