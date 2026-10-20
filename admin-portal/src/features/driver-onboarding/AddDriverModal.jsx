import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  phone_no: '',
  location: 'Koramangala, Bengaluru',
  status: 'PENDING',
};

const INITIAL_ERRORS = {
  name: '',
  phone_no: '',
  location: '',
};

const BENGALURU_AREAS = [
  'Koramangala, Bengaluru',
  'Indiranagar, Bengaluru',
  'Whitefield, Bengaluru',
  'HSR Layout, Bengaluru',
  'Electronic City, Bengaluru',
  'Jayanagar, Bengaluru',
  'MG Road / Central, Bengaluru',
  'Hebbal, Bengaluru',
  'Marathahalli, Bengaluru',
];

export default function AddDriverModal({ isOpen, onClose, onSubmit }) {
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

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = 'Driver name is required.';
      isValid = false;
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
      isValid = false;
    }

    // Phone validation (Indian 10-digit mobile number)
    const rawPhone = form.phone_no.replace(/\D/g, '');
    if (!form.phone_no.trim()) {
      newErrors.phone_no = 'Mobile phone number is required.';
      isValid = false;
    } else if (rawPhone.length < 10) {
      newErrors.phone_no = 'Enter a valid 10-digit mobile number.';
      isValid = false;
    } else {
      const tenDigit = rawPhone.slice(-10);
      if (!/^[6-9]\d{9}$/.test(tenDigit)) {
        newErrors.phone_no = 'Mobile number must start with 6, 7, 8, or 9.';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Field Change Handlers ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  // ── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const rawPhone = form.phone_no.replace(/\D/g, '');
      const formattedPhone = `+91 ${rawPhone.slice(-10, -5)} ${rawPhone.slice(-5)}`;

      await onSubmit({
        name: form.name.trim(),
        phone_no: formattedPhone,
        location: form.location,
        status: form.status,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setSubmitError(err.message || 'Failed to onboard driver. Please try again.');
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
      aria-labelledby="add-driver-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)'
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
              <UserPlus size={18} />
            </div>
            <div>
              <h2
                id="add-driver-modal-title"
                style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-main)' }}
              >
                Onboard New Driver
              </h2>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Register walk-in or offline driver applicant into the system.
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
        <form onSubmit={handleSubmit} noValidate>
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
                New driver records are initialized with placeholder KYC documents ready for verification in the queue.
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
                <span>Driver onboarded successfully! Updating records...</span>
              </div>
            )}

            {/* Field: Full Name */}
            <div>
              <label
                htmlFor="driver-name-input"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Full Name <span style={{ color: '#ef4444' }}>*</span>
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
                <User size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  id="driver-name-input"
                  name="name"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
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

            {/* Field: Phone Number */}
            <div>
              <label
                htmlFor="driver-phone-input"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Mobile Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px solid ${errors.phone_no ? '#f87171' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--background)'
                }}
              >
                <Phone size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>+91</span>
                <input
                  id="driver-phone-input"
                  name="phone_no"
                  type="tel"
                  placeholder="98765 43210"
                  value={form.phone_no}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  maxLength={14}
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
              {errors.phone_no && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.phone_no}
                </span>
              )}
            </div>

            {/* Field: Base Location */}
            <div>
              <label
                htmlFor="driver-location-select"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}
              >
                Base Operational Hub / Area
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
                  id="driver-location-select"
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
                  {BENGALURU_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field: Initial Onboarding Status */}
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
                    border: `1px solid ${form.status === 'PENDING' ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.status === 'PENDING' ? 'var(--primary-light)' : 'var(--background)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: form.status === 'PENDING' ? 'var(--primary)' : 'var(--text-main)'
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value="PENDING"
                    checked={form.status === 'PENDING'}
                    onChange={handleChange}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Pending (Queue for Review)</span>
                </label>

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
                  <span>Direct Active (Verified)</span>
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
              id="submit-add-driver-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" />
                  <span>Onboarding...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Register Driver</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
