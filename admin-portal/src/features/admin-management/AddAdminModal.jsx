import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Phone, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

const INITIAL_FORM = {
  admin_name: '',
  email_id: '',
  phone_no: '',
  password: '',
};

const INITIAL_ERRORS = {
  admin_name: '',
  email_id: '',
  phone_no: '',
  password: '',
};

/**
 * AddAdminModal
 * Modal form to add a new admin account.
 *
 * Props:
 *  - isOpen       {Boolean}   Controls visibility
 *  - onClose      {Function}  Called when modal is dismissed
 *  - onSubmit     {Function}  Called with form data on valid submit; must return a Promise
 */
export default function AddAdminModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Reset form state every time modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors(INITIAL_ERRORS);
      setShowPassword(false);
      setIsSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    if (!form.admin_name.trim() || form.admin_name.trim().length < 2) {
      newErrors.admin_name = 'Full name is required (minimum 2 characters)';
      isValid = false;
    } else if (form.admin_name.trim().length > 50) {
      newErrors.admin_name = 'Full name cannot exceed 50 characters';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email_id.trim()) {
      newErrors.email_id = 'Email is required';
      isValid = false;
    } else if (form.email_id.trim().length > 50) {
      newErrors.email_id = 'Email cannot exceed 50 characters';
      isValid = false;
    } else if (!emailRegex.test(form.email_id.trim())) {
      newErrors.email_id = 'Please enter a valid email address';
      isValid = false;
    }

    const digitsOnly = form.phone_no.replace(/\D/g, '');
    if (!form.phone_no.trim()) {
      newErrors.phone_no = 'Phone number is required';
      isValid = false;
    } else if (digitsOnly.length < 10) {
      newErrors.phone_no = 'Please enter a valid phone number (minimum 10 digits)';
      isValid = false;
    } else if (form.phone_no.trim().length > 20) {
      newErrors.phone_no = 'Phone number cannot exceed 20 characters';
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = 'Temporary password is required';
      isValid = false;
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    } else if (form.password.length > 50) {
      newErrors.password = 'Password cannot exceed 50 characters';
      isValid = false;
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter (A-Z)';
      isValid = false;
    } else if (!/[a-z]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter (a-z)';
      isValid = false;
    } else if (!/\d/.test(form.password)) {
      newErrors.password = 'Password must contain at least one number (0-9)';
      isValid = false;
    } else if (!/[@$!%*?&#^_\-+=[\]{}|;:,.<>]/.test(form.password)) {
      newErrors.password = 'Password must contain at least one special character (@$!%*?&)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Field change handler ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on edit
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // prevent double-submit

    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        admin_name: form.admin_name.trim(),
        email_id: form.email_id.trim().toLowerCase(),
        phone_no: form.phone_no.trim(),
        password: form.password,
      });
      setSubmitSuccess(true);
      // Auto-close after brief success flash
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Backdrop click ────────────────────────────────────────────────────────
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-admin-modal-title"
    >
      <div className="modal-panel add-admin-modal">

        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrap">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 id="add-admin-modal-title" className="modal-title">Add New Admin</h2>
              <p className="modal-subtitle">New admin will have full portal access</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Success flash ── */}
        {submitSuccess && (
          <div className="modal-success-banner">
            <CheckCircle2 size={16} />
            <span>Admin added successfully!</span>
          </div>
        )}

        {/* ── Submit-level error ── */}
        {submitError && (
          <div className="modal-error-banner">
            <AlertCircle size={16} />
            <span>{submitError}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate className="modal-form">

          {/* Full Name */}
          <div className="form-field">
            <label htmlFor="add-admin-name" className="form-label">
              <User size={14} />
              Full Name <span className="required-star">*</span>
            </label>
            <input
              id="add-admin-name"
              type="text"
              name="admin_name"
              maxLength={50}
              value={form.admin_name}
              onChange={handleChange}
              placeholder="e.g. Priya Mehta"
              className={`form-input ${errors.admin_name ? 'input-error' : ''}`}
              autoComplete="name"
              disabled={isSubmitting || submitSuccess}
            />
            {errors.admin_name && (
              <span className="field-error" role="alert">
                <AlertCircle size={12} /> {errors.admin_name}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="add-admin-email" className="form-label">
              <Mail size={14} />
              Email Address <span className="required-star">*</span>
            </label>
            <input
              id="add-admin-email"
              type="email"
              name="email_id"
              maxLength={50}
              value={form.email_id}
              onChange={handleChange}
              placeholder="e.g. priya@hired.com"
              className={`form-input ${errors.email_id ? 'input-error' : ''}`}
              autoComplete="email"
              disabled={isSubmitting || submitSuccess}
            />
            {errors.email_id && (
              <span className="field-error" role="alert">
                <AlertCircle size={12} /> {errors.email_id}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="form-field">
            <label htmlFor="add-admin-phone" className="form-label">
              <Phone size={14} />
              Phone Number <span className="required-star">*</span>
            </label>
            <input
              id="add-admin-phone"
              type="tel"
              name="phone_no"
              maxLength={20}
              value={form.phone_no}
              onChange={handleChange}
              placeholder="e.g. +91 98765 43210"
              className={`form-input ${errors.phone_no ? 'input-error' : ''}`}
              autoComplete="tel"
              disabled={isSubmitting || submitSuccess}
            />
            {errors.phone_no && (
              <span className="field-error" role="alert">
                <AlertCircle size={12} /> {errors.phone_no}
              </span>
            )}
          </div>

          {/* Temporary Password */}
          <div className="form-field">
            <label htmlFor="add-admin-password" className="form-label">
              Temporary Password <span className="required-star">*</span>
            </label>
            <div className="input-password-wrap">
              <input
                id="add-admin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                maxLength={50}
                value={form.password}
                onChange={handleChange}
                placeholder="e.g. TempPass@2026"
                className={`form-input input-with-toggle ${errors.password ? 'input-error' : ''}`}
                autoComplete="new-password"
                disabled={isSubmitting || submitSuccess}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <span className="field-error" role="alert">
                <AlertCircle size={12} /> {errors.password}
              </span>
            )}
            <div className="password-rules-strip" aria-label="Password requirements">
              <span className={`rule-pill ${form.password.length >= 8 ? 'rule-met' : ''}`}>
                8+ chars
              </span>
              <span className={`rule-pill ${/[A-Z]/.test(form.password) ? 'rule-met' : ''}`}>
                Uppercase
              </span>
              <span className={`rule-pill ${/[a-z]/.test(form.password) ? 'rule-met' : ''}`}>
                Lowercase
              </span>
              <span className={`rule-pill ${/\d/.test(form.password) ? 'rule-met' : ''}`}>
                Number
              </span>
              <span className={`rule-pill ${/[@$!%*?&#^_\-+=[\]{}|;:,.<>]/.test(form.password) ? 'rule-met' : ''}`}>
                Symbol
              </span>
            </div>
            <p className="field-hint">
              Must include 8+ chars, uppercase, lowercase, number, and a special symbol.
            </p>
          </div>

          {/* ── Footer actions ── */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting || submitSuccess}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || submitSuccess}
              id="add-admin-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Adding Admin…
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  Added!
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  Add Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
