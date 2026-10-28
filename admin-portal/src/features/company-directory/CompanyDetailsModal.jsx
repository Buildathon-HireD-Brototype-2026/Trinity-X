import { getFriendlyError } from '../../utils/friendlyError';
import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Percent,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Save,
  Lock,
  Layers,
  FileText
} from 'lucide-react';

export default function CompanyDetailsModal({
  company,
  isOpen,
  onClose,
  onUpdateSplit,
  canManageCompanies = true
}) {
  const [isEditingSplit, setIsEditingSplit] = useState(false);
  const [hiredSplit, setHiredSplit] = useState(20);
  const [driverSplit, setDriverSplit] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitError, setSplitError] = useState('');

  // Sync state when company opens
  useEffect(() => {
    if (company && isOpen) {
      setHiredSplit(Number(company.hiredSplit ?? 20));
      setDriverSplit(Number(company.driverSplit ?? 80));
      setIsEditingSplit(false);
      setSplitError('');
      setIsSubmitting(false);
    }
  }, [company, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !company) return null;

  const isActive = company.status === 'ACTIVE';
  const currentSum = Number(hiredSplit) + Number(driverSplit);
  const isSumValid = Math.abs(currentSum - 100) < 0.01;

  // Mask phone number for non-admin sessions (PII protection)
  const displayPhone = () => {
    if (!company.phoneNo) return '—';
    if (canManageCompanies) return company.phoneNo;
    const parts = company.phoneNo.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return company.phoneNo.slice(0, 7) + '•••••';
  };

  const handleSaveSplit = async (e) => {
    e.preventDefault();
    setSplitError('');

    const h = Number(hiredSplit);
    const d = Number(driverSplit);

    if (isNaN(h) || isNaN(d) || h < 0 || d < 0 || h > 100 || d > 100) {
      setSplitError('Split percentages must be valid numbers between 0% and 100%.');
      return;
    }

    if (!isSumValid) {
      setSplitError(`HireD split (${h}%) and Driver split (${d}%) must sum to exactly 100.00%. Current sum: ${currentSum.toFixed(2)}%.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateSplit(company.companyId, h, d);
      setIsEditingSplit(false);
    } catch (err) {
      setSplitError(getFriendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetClick = (h, d) => {
    setHiredSplit(h);
    setDriverSplit(d);
    setSplitError('');
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
      aria-labelledby="company-details-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '660px',
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
                justifyContent: 'center',
                fontSize: '1.125rem',
                fontWeight: 700
              }}
            >
              {company.name.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2
                  id="company-details-title"
                  style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}
                >
                  {company.name}
                </h2>
                <span
                  className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {company.status}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Account Reference: CMP-{String(company.companyId).padStart(3, '0')} • Dispatch Office: OFF-{String(company.officeId || 1).padStart(3, '0')}
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

        {/* ── Modal Body ── */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Inactive Account Warning Callout */}
          {!isActive && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Deactivated Client Account:</strong> Transport booking dispatch orders for this company are suspended until the account is reactivated.
              </span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: 'var(--background)',
              padding: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                TOTAL BOOKINGS
              </span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem', display: 'block' }}>
                {company.totalBookings || 0} Trips
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                ACTIVE STATUS
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? '#16a34a' : 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                {isActive ? 'Eligible for Dispatch' : 'Suspended'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                CLIENT SINCE
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', marginTop: '0.2rem', display: 'block' }}>
                {new Date(company.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Corporate Profile Details */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Corporate Profile & Primary Contact
            </h4>
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
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>PRIMARY CONTACT</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{company.contactPerson}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CORPORATE EMAIL</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                  {company.emailId}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>PHONE NUMBER</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                  {displayPhone()}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>BASE LOCATION / ZONE</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                  {company.companyLocation || 'Bengaluru'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>REGISTERED ADDRESS</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '0.1rem', display: 'block' }}>
                  {company.address || company.companyLocation || 'Bengaluru, Karnataka'}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Payout Split Configuration Section (PRD A-11) */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.125rem',
              background: 'var(--surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    padding: '0.35rem',
                    borderRadius: '4px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)'
                  }}
                >
                  <Percent size={15} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Revenue Payout Split Configuration
                  </h4>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Determines automatic fare split upon trip billing completion.
                  </p>
                </div>
              </div>

              {!isEditingSplit && canManageCompanies && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setIsEditingSplit(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Edit3 size={13} />
                  <span>Edit Split</span>
                </button>
              )}
            </div>

            {/* Error Banner */}
            {splitError && (
              <div className="page-error-banner" style={{ padding: '0.55rem 0.75rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{splitError}</span>
              </div>
            )}

            {!isEditingSplit ? (
              // Display Mode
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'var(--background)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                    HIRED PLATFORM SPLIT
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.15rem', display: 'block' }}>
                    {company.hiredSplit}%
                  </span>
                </div>

                <div style={{ height: '36px', width: '1px', background: 'var(--border)' }} />

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                    DRIVER EARNING SPLIT
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '0.15rem', display: 'block' }}>
                    {company.driverSplit}%
                  </span>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSaveSplit}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                    background: 'var(--background)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => handlePresetClick(20, 80)}
                      className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      20% / 80% (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetClick(15, 85)}
                      className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      15% / 85%
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetClick(10, 90)}
                      className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      10% / 90%
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        HireD Split (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={hiredSplit}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setHiredSplit(val);
                          setDriverSplit(parseFloat((100 - val).toFixed(2)));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        Driver Split (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={driverSplit}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDriverSplit(val);
                          setHiredSplit(parseFloat((100 - val).toFixed(2)));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Validation indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: isSumValid ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      Total: {currentSum.toFixed(2)}% {isSumValid ? '✓ Valid (100.00%)' : '⚠ Must equal 100.00%'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsEditingSplit(false)}
                        disabled={isSubmitting}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting || !isSumValid}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Split'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--background)'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
