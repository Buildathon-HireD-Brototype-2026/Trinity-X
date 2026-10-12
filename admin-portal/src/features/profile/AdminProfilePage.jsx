import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  KeyRound,
  Edit3,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function AdminProfilePage({ onNavigate }) {
  const { user, updateProfile } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const adminName = user?.name || 'Neha Sharma';
  const adminEmail = user?.email || 'admin2@hired.com';
  const adminPhone = user?.phone || '+91 98765 43210';
  const adminRole = user?.role || 'Admin';
  const initial = adminName.charAt(0).toUpperCase();

  const [formData, setFormData] = useState({
    name: adminName,
    phone: adminPhone,
    email: adminEmail,
  });
  const [formErrors, setFormErrors] = useState({});

  const handleCopy = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      fallbackCopy(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch {
      // Graceful degradation
    }
  };

  const handleStartEditing = () => {
    setFormData({
      name: adminName,
      phone: adminPhone,
      email: adminEmail,
    });
    setFormErrors({});
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Full name is required (minimum 2 characters)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim() || digitsOnly.length < 10) {
      errors.phone = 'Please enter a valid phone number (minimum 10 digits)';
    }

    return errors;
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (updateProfile) {
      updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      });
    }

    setIsEditing(false);
    setFormErrors({});
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="admin-profile-page-container">
      {/* Top Navigation & Breadcrumb Header */}
      <div className="profile-page-header">
        <div className="profile-page-header-row">
          <button
            type="button"
            className="profile-back-btn"
            onClick={() => onNavigate && onNavigate('dashboard')}
            title="Return to Dashboard Overview"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          {!isEditing ? (
            <button
              type="button"
              className="profile-edit-btn"
              onClick={handleStartEditing}
              title="Edit Admin Profile credentials"
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              type="button"
              className="profile-cancel-header-btn"
              onClick={handleCancelEditing}
              title="Cancel editing"
            >
              <X size={15} />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <div className="profile-page-title-wrap">
          <h1 className="profile-page-title">Admin Profile</h1>
          <p className="profile-page-subtitle">
            Administrator identity, contact credentials, and system verification privileges.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="profile-success-banner" role="status">
          <CheckCircle2 size={18} className="success-banner-icon" />
          <span>Profile credentials updated successfully.</span>
        </div>
      )}

      {/* Main Profile Canvas Card */}
      {!isEditing ? (
        <div className="profile-page-card">
          {/* Hero Identity Banner */}
          <div className="profile-page-hero">
            <div className="profile-page-avatar-wrap">
              <div className="profile-page-avatar">
                <span>{initial}</span>
              </div>
              <span className="profile-page-online-badge" title="Active Administrator" />
            </div>

            <div className="profile-page-hero-info">
              <div className="profile-hero-name-row">
                <h2 className="profile-page-admin-name">{adminName}</h2>
                <span className="profile-page-role-pill">
                  <ShieldCheck size={13} />
                  <span>{adminRole.toUpperCase()}</span>
                </span>
              </div>
              <span className="profile-page-hero-email">{adminEmail}</span>
            </div>
          </div>

          {/* Credentials Grid: Admin Name, Phone No, Email ID */}
          <div className="profile-page-grid">
            {/* 1. Admin Name */}
            <div className="profile-credential-card">
              <div className="credential-icon-wrap">
                <User size={18} />
              </div>
              <div className="credential-details">
                <span className="credential-label">Admin Name</span>
                <span className="credential-value">{adminName}</span>
              </div>
            </div>

            {/* 2. Phone Number */}
            <div className="profile-credential-card">
              <div className="credential-icon-wrap">
                <Phone size={18} />
              </div>
              <div className="credential-details">
                <span className="credential-label">Phone Number</span>
                <span className="credential-value">{adminPhone}</span>
              </div>
              <button
                type="button"
                className="credential-copy-action"
                onClick={() => handleCopy(adminPhone, 'phone')}
                title="Copy Phone Number"
                aria-label="Copy Phone Number"
              >
                {copiedField === 'phone' ? (
                  <span className="copied-tag">
                    <Check size={13} /> Copied
                  </span>
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>

            {/* 3. Email ID */}
            <div className="profile-credential-card">
              <div className="credential-icon-wrap">
                <Mail size={18} />
              </div>
              <div className="credential-details">
                <span className="credential-label">Email ID</span>
                <span className="credential-value">{adminEmail}</span>
              </div>
              <button
                type="button"
                className="credential-copy-action"
                onClick={() => handleCopy(adminEmail, 'email')}
                title="Copy Email ID"
                aria-label="Copy Email ID"
              >
                {copiedField === 'email' ? (
                  <span className="copied-tag">
                    <Check size={13} /> Copied
                  </span>
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          </div>

          {/* Security & Access Rights Card */}
          <div className="profile-security-card">
            <div className="security-card-header">
              <KeyRound size={16} className="security-card-icon" />
              <h3 className="security-card-title">Security & Verification Authority</h3>
            </div>
            <div className="security-items-list">
              <div className="security-item">
                <CheckCircle2 size={16} className="security-check-icon" />
                <div>
                  <span className="security-item-title">Two-Person Verification Sign-off</span>
                  <p className="security-item-desc">
                    Authorized to perform mandatory co-administrator sign-off for corporate month-end statements.
                  </p>
                </div>
              </div>
              <div className="security-item">
                <CheckCircle2 size={16} className="security-check-icon" />
                <div>
                  <span className="security-item-title">Full Platform Operations</span>
                  <p className="security-item-desc">
                    Administrative oversight over order acceptance, driver assignment, trip tracking, and reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode Form Card */
        <div className="profile-page-card profile-edit-form-card">
          <div className="profile-edit-form-header">
            <div className="edit-form-header-left">
              <div className="edit-badge-icon">
                <Edit3 size={18} />
              </div>
              <div>
                <h2 className="profile-edit-title">Edit Administrator Profile</h2>
                <p className="profile-edit-desc">
                  Update your contact credentials and display details. Role privileges are managed by platform policy.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-edit-form" noValidate>
            <div className="profile-edit-fields-grid">
              {/* Field 1: Admin Name */}
              <div className="profile-form-group">
                <label htmlFor="admin-name-input" className="profile-form-label">
                  <User size={14} />
                  <span>Admin Name</span>
                </label>
                <input
                  id="admin-name-input"
                  type="text"
                  className={`profile-form-input ${formErrors.name ? 'has-error' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="Enter full admin name"
                  autoFocus
                />
                {formErrors.name && (
                  <span className="profile-form-error">
                    <AlertCircle size={13} />
                    <span>{formErrors.name}</span>
                  </span>
                )}
              </div>

              {/* Field 2: Phone Number */}
              <div className="profile-form-group">
                <label htmlFor="admin-phone-input" className="profile-form-label">
                  <Phone size={14} />
                  <span>Phone Number</span>
                </label>
                <input
                  id="admin-phone-input"
                  type="tel"
                  className={`profile-form-input ${formErrors.phone ? 'has-error' : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  placeholder="e.g. +91 98765 43210"
                />
                {formErrors.phone && (
                  <span className="profile-form-error">
                    <AlertCircle size={13} />
                    <span>{formErrors.phone}</span>
                  </span>
                )}
              </div>

              {/* Field 3: Email ID */}
              <div className="profile-form-group">
                <label htmlFor="admin-email-input" className="profile-form-label">
                  <Mail size={14} />
                  <span>Email ID</span>
                </label>
                <input
                  id="admin-email-input"
                  type="email"
                  className={`profile-form-input ${formErrors.email ? 'has-error' : ''}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  placeholder="e.g. admin@hired.com"
                />
                {formErrors.email && (
                  <span className="profile-form-error">
                    <AlertCircle size={13} />
                    <span>{formErrors.email}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-btn-secondary"
                onClick={handleCancelEditing}
              >
                <X size={15} />
                <span>Cancel</span>
              </button>

              <button type="submit" className="profile-btn-primary">
                <Check size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
