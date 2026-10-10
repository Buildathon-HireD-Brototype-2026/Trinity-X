import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockout, setLockout] = useState({ isLocked: false, remainingSeconds: 0 });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Check lockout status and run countdown timer if locked
  useEffect(() => {
    const status = authService.getLockoutStatus();
    setLockout(status);

    if (status.isLocked) {
      const interval = setInterval(() => {
        const updated = authService.getLockoutStatus();
        setLockout(updated);
        if (!updated.isLocked) {
          clearInterval(interval);
          setError('');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide your registered corporate email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      setLockout(authService.getLockoutStatus());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('partner@apexlogistics.com');
    setPassword('PartnerPass123!');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(111, 39, 148, 0.08) 0%, transparent 60%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.svg"
            alt="HireD Logo"
            style={{ height: '48px', width: 'auto', marginBottom: '0.75rem' }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            HireD Partner Portal
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Enterprise Transport & Fulfillment
          </p>
        </div>

        {/* Login Card */}
        <div
          className="card"
          style={{
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '2rem',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Partner Sign In
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Credentials are created and managed by HireD Admin
            </p>
          </div>

          {/* Lockout Warning */}
          {lockout.isLocked && (
            <div
              className="notice-box notice-warning"
              style={{ alignItems: 'center', marginBottom: '1.25rem' }}
            >
              <ShieldAlert size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong>Security Lockout:</strong> 5 failed attempts reached. Please wait{' '}
                <span style={{ fontWeight: 700 }}>
                  {Math.floor(lockout.remainingSeconds / 60)}m {lockout.remainingSeconds % 60}s
                </span>{' '}
                before retrying.
              </div>
            </div>
          )}

          {/* Standard Error Message */}
          {error && !lockout.isLocked && (
            <div
              className="notice-box"
              style={{
                backgroundColor: 'var(--danger-bg)',
                borderColor: 'var(--danger-border)',
                color: 'var(--danger)',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                Corporate Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="email-input"
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="partner@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={lockout.isLocked || isSubmitting}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="password-input">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingLeft: '38px', paddingRight: '40px' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lockout.isLocked || isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    padding: '2px',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', height: '44px' }}
              disabled={lockout.isLocked || isSubmitting}
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo Helper Box */}
          <div
            style={{
              marginTop: '1.75rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#FAF5FF',
              border: '1px dashed var(--primary-300)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Sparkles size={14} /> Demo Reviewer Access
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Auto-fill
              </button>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <div>
                <strong>Email:</strong> <code>partner@apexlogistics.com</code>
              </div>
              <div>
                <strong>Password:</strong> <code>PartnerPass123!</code>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Enterprise Account: Apex Global Logistics (ID #101)
              </div>
            </div>
          </div>
        </div>

        {/* Security & Isolation Footer Note */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <ShieldCheck size={14} color="var(--success)" />
          <span>Strict Partner Tenant Isolation • Data belongs exclusively to your company</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
