import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Percent,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  contactPerson: '',
  emailId: '',
  phoneNo: '',
  location: 'Whitefield, Bengaluru',
  status: 'ACTIVE',
  hiredSplit: 20,
  driverSplit: 80
};

const INITIAL_ERRORS = {
  name: '',
  contactPerson: '',
  emailId: '',
  phoneNo: '',
  split: ''
};

const BENGALURU_HUBS = [
  'Whitefield, Bengaluru',
  'Electronic City, Bengaluru',
  'Indiranagar, Bengaluru',
  'Koramangala, Bengaluru',
  'HSR Layout, Bengaluru',
  'Manyata Tech Park, Hebbal',
  'Marathahalli / Bellandur, Bengaluru',
  'MG Road / Central Bengaluru'
];

export default function AddCompanyModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors(INITIAL_ERRORS);
      setIsSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    // Company Name
    if (!form.name.trim()) {
      newErrors.name = 'Company name is required.';
      isValid = false;
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Company name must be at least 2 characters.';
      isValid = false;
    }

    // Contact Person
    if (!form.contactPerson.trim()) {
      newErrors.contactPerson = 'Primary contact person is required.';
      isValid = false;
    }

    // Email
    const emailTrim = form.emailId.trim();
    if (!emailTrim) {
      newErrors.emailId = 'Corporate email address is required.';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      newErrors.emailId = 'Please enter a valid corporate email address.';
      isValid = false;
    }

    // Phone Number (Indian 10-digit mobile check)
    const rawPhone = form.phoneNo.replace(/\D/g, '');
    if (!form.phoneNo.trim()) {
      newErrors.phoneNo = 'Contact phone number is required.';
      isValid = false;
    } else if (rawPhone.length < 10) {
      newErrors.phoneNo = 'Enter a valid 10-digit mobile number.';
      isValid = false;
    } else {
      const tenDigit = rawPhone.slice(-10);
      if (!/^[6-9]\d{9}$/.test(tenDigit)) {
        newErrors.phoneNo = 'Mobile number must start with 6, 7, 8, or 9.';
        isValid = false;
      }
    }

    // Payout Split Validation
    const h = Number(form.hiredSplit);
    const d = Number(form.driverSplit);
    if (isNaN(h) || isNaN(d) || h < 0 || d < 0 || h > 100 || d > 100) {
      newErrors.split = 'Split percentages must be between 0.00% and 100.00%.';
      isValid = false;
    } else if (Math.abs(h + d - 100) > 0.01) {
      newErrors.split = `HireD split (${h}%) and Driver split (${d}%) must sum to exactly 100.00%.`;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (errors.split && (name === 'hiredSplit' || name === 'driverSplit')) {
      setErrors((prev) => ({ ...prev, split: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const rawPhone = form.phoneNo.replace(/\D/g, '');
      const formattedPhone = `+91 ${rawPhone.slice(-10, -5)} ${rawPhone.slice(-5)}`;

      await onSubmit({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        emailId: form.emailId.trim().toLowerCase(),
        phoneNo: formattedPhone,
        location: form.location,
        status: form.status,
        hiredSplit: Number(Number(form.hiredSplit).toFixed(2)),
        driverSplit: Number(Number(form.driverSplit).toFixed(2))
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setSubmitError(err.message || 'Failed to onboard company. Please try again.');
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
      aria-labelledby="add-company-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          maxHeight: '92vh'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h2
                id="add-company-modal-title"
                style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-main)' }}
              >
                Onboard Client Company
              </h2>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Register a new corporate enterprise client for transport booking dispatch.
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

        {/* ── Form Body ── */}
        <form onSubmit={handleSubmit} noValidate style={{ overflowY: 'auto' }}>
          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.125rem'
            }}
          >
            {/* PRD Rule Callout */}
            <div
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-subtle)',
                color: 'var(--primary)',
                fontSize: '0.78125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>
                New companies are assigned to regional office <strong>OFF-001</strong> with customizable revenue payout splits.
              </span>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success Banner */}
            {submitSuccess && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Company onboarded successfully! Updating directory...</span>
              </div>
            )}

            {/* Field: Company Name */}
            <div>
              <label
                htmlFor="company-name-input"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Company Legal Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px solid ${errors.name ? '#f87171' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--background)'
                }}
              >
                <Building2 size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  id="company-name-input"
                  name="name"
                  type="text"
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.8125rem',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              {errors.name && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>

            {/* Field: Contact Person */}
            <div>
              <label
                htmlFor="company-contact-input"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Primary Contact Person <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px solid ${errors.contactPerson ? '#f87171' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--background)'
                }}
              >
                <User size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  id="company-contact-input"
                  name="contactPerson"
                  type="text"
                  placeholder="e.g. Aditi Rao"
                  value={form.contactPerson}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.8125rem',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              {errors.contactPerson && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.contactPerson}
                </span>
              )}
            </div>

            {/* Two-Column: Corporate Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  htmlFor="company-email-input"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
                >
                  Corporate Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: `1px solid ${errors.emailId ? '#f87171' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--background)'
                  }}
                >
                  <Mail size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    id="company-email-input"
                    name="emailId"
                    type="email"
                    placeholder="contact@company.com"
                    value={form.emailId}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '100%',
                      fontSize: '0.8125rem',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
                {errors.emailId && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.emailId}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="company-phone-input"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
                >
                  Contact Phone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: `1px solid ${errors.phoneNo ? '#f87171' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--background)'
                  }}
                >
                  <Phone size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', fontWeight: 600 }}>+91</span>
                  <input
                    id="company-phone-input"
                    name="phoneNo"
                    type="tel"
                    placeholder="98765 43210"
                    maxLength={14}
                    value={form.phoneNo}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '100%',
                      fontSize: '0.8125rem',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
                {errors.phoneNo && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.phoneNo}
                  </span>
                )}
              </div>
            </div>

            {/* Field: Base Location / Hub */}
            <div>
              <label
                htmlFor="company-location-select"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Base Operational Hub / Tech Park
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--background)'
                }}
              >
                <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <select
                  id="company-location-select"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.8125rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {BENGALURU_HUBS.map((hub) => (
                    <option key={hub} value={hub}>
                      {hub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field: Payout Split Config (PRD A-11) */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem',
                background: 'var(--background)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Percent size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Revenue Payout Split Ratio
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    HireD Platform Split (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="hiredSplit"
                    value={form.hiredSplit}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm((prev) => ({
                        ...prev,
                        hiredSplit: val,
                        driverSplit: parseFloat((100 - val).toFixed(2))
                      }));
                      if (errors.split) setErrors((prev) => ({ ...prev, split: '' }));
                    }}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Driver Payout Split (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="driverSplit"
                    value={form.driverSplit}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm((prev) => ({
                        ...prev,
                        driverSplit: val,
                        hiredSplit: parseFloat((100 - val).toFixed(2))
                      }));
                      if (errors.split) setErrors((prev) => ({ ...prev, split: '' }));
                    }}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
              </div>

              {errors.split ? (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.35rem', display: 'block' }}>
                  {errors.split}
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.35rem', display: 'block' }}>
                  ✓ Sum: {(Number(form.hiredSplit) + Number(form.driverSplit)).toFixed(2)}% (100.00% Required)
                </span>
              )}
            </div>

            {/* Field: Initial Account Status */}
            <div>
              <label
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Initial Account Status
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${form.status === 'ACTIVE' ? '#22c55e' : 'var(--border)'}`,
                    background: form.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'var(--background)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: form.status === 'ACTIVE' ? '#16a34a' : 'var(--text-main)'
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value="ACTIVE"
                    checked={form.status === 'ACTIVE'}
                    onChange={handleChange}
                    style={{ accentColor: '#16a34a' }}
                  />
                  <span>Active (Direct Dispatch)</span>
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${form.status === 'INACTIVE' ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.status === 'INACTIVE' ? 'var(--primary-light)' : 'var(--background)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: form.status === 'INACTIVE' ? 'var(--primary)' : 'var(--text-main)'
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value="INACTIVE"
                    checked={form.status === 'INACTIVE'}
                    onChange={handleChange}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Inactive (Suspended)</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.625rem',
              background: 'var(--background)'
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || submitSuccess}
              id="submit-add-company-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" />
                  <span>Onboarding...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={14} />
                  <span>Register Company</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
