import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import logoImg from '../../assets/logo.png';
import { getFriendlyError } from '../../utils/friendlyError';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(() => {
    try {
      const reason = sessionStorage.getItem('hired_logout_reason');
      if (reason) {
        return 'Please log in again to continue.';
      }
      return null;
    } catch {
      return null;
    }
  });

  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Please enter your email address.';
    } else if (trimmedEmail.length > 50) {
      errors.email = 'Email address cannot exceed 50 characters.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    } else if (password.length > 50) {
      errors.password = 'Password cannot exceed 50 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const dismissNotice = () => {
    if (notice) {
      setNotice(null);
      try {
        sessionStorage.removeItem('hired_logout_reason');
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    dismissNotice();

    if (!validate()) {
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      setError(getFriendlyError(err, 'Invalid email or password. Please try again.'));
      setPassword('');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Header with Logo */}
        <div className="login-header">
          <img src={logoImg} alt="HireD Logo" className="login-logo" />
          <h1 className="login-title">Admin Portal</h1>
          <p className="login-subtitle">Sign in to manage the HireD fleet and operations</p>
        </div>

        {/* User-friendly Re-login Notice Banner */}
        {notice && (
          <div className="inactivity-banner" role="alert">
            <AlertCircle size={18} className="inactivity-icon" />
            <div className="inactivity-text">
              <span>{notice}</span>
            </div>
            <button
              type="button"
              className="inactivity-close-btn"
              onClick={dismissNotice}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="admin-email" className="form-label">
              Admin Email
            </label>
            <div className={`input-container ${fieldErrors.email ? 'has-error' : ''}`}>
              <Mail size={18} className="input-icon" />
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@hired.com"
                maxLength={50}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                disabled={loading}
                autoFocus
              />
            </div>
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="admin-password" className="form-label">
              Password
            </label>
            <div className={`input-container ${fieldErrors.password ? 'has-error' : ''}`}>
              <Lock size={18} className="input-icon" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                maxLength={50}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error-text">{fieldErrors.password}</span>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
