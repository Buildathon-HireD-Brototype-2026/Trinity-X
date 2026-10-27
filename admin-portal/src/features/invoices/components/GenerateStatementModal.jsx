import React, { useState } from 'react';
import { X, PlusCircle, Building2, Calendar, FileText } from 'lucide-react';

const CORPORATE_COMPANIES = [
  { id: 'comp-1', name: 'TechCorp Solutions Ltd', email: 'billing@techcorpsolutions.com', contact: 'Rajesh Sharma' },
  { id: 'comp-2', name: 'Infosys BPM Corporate Services', email: 'accounts.payable@infosys.com', contact: 'Ananya Deshmukh' },
  { id: 'comp-3', name: 'Wipro Technologies Bangalore', email: 'travel.billing@wipro.com', contact: 'Siddharth Rao' },
  { id: 'comp-4', name: 'Tata Consultancy Services', email: 'corporate.travel@tcs.com', contact: 'Kavita Menon' },
];

export default function GenerateStatementModal({ isOpen, onClose, onGenerate, currentAdmin }) {
  if (!isOpen) return null;

  const [selectedCompanyId, setSelectedCompanyId] = useState(CORPORATE_COMPANIES[0].id);
  const [billingPeriod, setBillingPeriod] = useState('October 2026');
  const [tripCount, setTripCount] = useState(35);
  const [subtotal, setSubtotal] = useState(42000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedCompany = CORPORATE_COMPANIES.find((c) => c.id === selectedCompanyId) || CORPORATE_COMPANIES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      await onGenerate({
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        companyEmail: selectedCompany.email,
        billingContact: selectedCompany.contact,
        billingPeriod,
        tripCount: Number(tripCount),
        subtotal: Number(subtotal),
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate statement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedPlatformFee = Math.round(subtotal * 0.1);
  const estimatedTax = Number((estimatedPlatformFee * 0.18).toFixed(2));
  const estimatedTotal = Number((subtotal + estimatedPlatformFee + estimatedTax).toFixed(2));

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
        zIndex: 1050,
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
          maxWidth: '540px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                Generate Monthly Statement
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)' }}>
                Draft corporate billing statement for two-person verification
              </p>
            </div>
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
        <form id="generate-statement-form" onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
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
              }}
            >
              {error}
            </div>
          )}

          {/* Select Corporate Company */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Corporate Company <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="statement-company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #d1d5db)',
                fontSize: '0.875rem',
              }}
            >
              {CORPORATE_COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {/* Billing Period */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Billing Cycle / Period
            </label>
            <input
              id="statement-period-input"
              type="text"
              required
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              placeholder="e.g. October 2026"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #d1d5db)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Trips Count & Gross Fare */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Completed Corporate Trips
              </label>
              <input
                id="statement-trips-count-input"
                type="number"
                min="1"
                required
                value={tripCount}
                onChange={(e) => setTripCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #d1d5db)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Gross Ride Fares (₹)
              </label>
              <input
                id="statement-subtotal-input"
                type="number"
                min="100"
                required
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #d1d5db)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Statement Financial Estimate Preview */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#6b7280' }}>Platform Service Fee (10%):</span>
              <span>₹{estimatedPlatformFee.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: '#6b7280' }}>GST on Service (18%):</span>
              <span>₹{estimatedTax.toLocaleString('en-IN')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.4rem',
                borderTop: '1px solid #e2e8f0',
                fontWeight: 600,
              }}
            >
              <span>Estimated Payable Amount:</span>
              <span style={{ color: '#2563eb' }}>₹{estimatedTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
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
            Cancel
          </button>
          <button
            id="generate-statement-submit-btn"
            type="submit"
            form="generate-statement-form"
            disabled={isSubmitting}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Draft Statement'}
          </button>
        </div>
      </div>
    </div>
  );
}
