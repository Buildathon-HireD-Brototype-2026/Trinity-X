import React from 'react';
import { FileCheck, Clock, CheckCircle2, Send, IndianRupee } from 'lucide-react';

export default function InvoiceMetricsStrip({ invoices = [] }) {
  const pendingCount = invoices.filter(
    (i) => i.status === 'PENDING_APPROVAL_1' || i.status === 'PENDING_APPROVAL_2'
  ).length;

  const verifiedCount = invoices.filter((i) => i.status === 'VERIFIED').length;
  const sentCount = invoices.filter((i) => i.status === 'SENT').length;

  const totalVolume = invoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  return (
    <div className="invoice-metrics-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* Metric 1: Pending Approvals */}
      <div className="card metric-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'rgba(234, 179, 8, 0.15)',
          color: '#ca8a04',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Clock size={22} />
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>
            Pending Verification
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary, #111827)' }}>
            {pendingCount}
          </h3>
        </div>
      </div>

      {/* Metric 2: Verified & Ready to Send */}
      <div className="card metric-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FileCheck size={22} />
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>
            Verified & Ready to Send
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary, #111827)' }}>
            {verifiedCount}
          </h3>
        </div>
      </div>

      {/* Metric 3: Sent to B2B Company */}
      <div className="card metric-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Send size={22} />
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>
            Sent to B2B Clients
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary, #111827)' }}>
            {sentCount}
          </h3>
        </div>
      </div>

      {/* Metric 4: Total Invoiced Billing */}
      <div className="card metric-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'rgba(147, 51, 234, 0.15)',
          color: '#7e22ce',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <IndianRupee size={22} />
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', fontWeight: 500 }}>
            Total Invoiced Volume
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary, #111827)' }}>
            ₹{totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </h3>
        </div>
      </div>
    </div>
  );
}
