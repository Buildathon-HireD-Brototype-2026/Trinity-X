import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Sun,
  Moon,
  ExternalLink,
  Users,
  Calendar,
  CheckCircle2,
  Car,
  Headphones,
  Award,
  Phone,
} from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

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
        backgroundColor: 'var(--bg-page)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.25s ease',
      }}
    >
      {/* Top Header Bar with Theme Toggle & Official Site Link */}
      <header
        style={{
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.svg" alt="HireD Logo" style={{ height: '36px', width: 'auto' }} />
          <span className="brand-badge">B2B Portal</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="https://hiredassist.in/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>Official Website</span>
            <ExternalLink size={14} />
          </a>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="var(--primary)" />}
          </button>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1180px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Official HireD Brand Showcase & Pilot Section */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--primary)',
                background: 'var(--primary-100)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                marginBottom: '1rem',
              }}
            >
              <Award size={14} /> HireD Chauffeur & Enterprise Assist
            </div>

            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                marginBottom: '1rem',
              }}
            >
              Safe Rides, <br />
              <span style={{ color: 'var(--primary)' }}>Happy Customers, Always HireD.</span>
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '1.75rem',
              }}
            >
              Your trusted partner for stress-free and convenient rides. HireD provides vetted on-demand
              drivers, corporate chauffeur assist, and automated fleet fulfillment across Kochi,
              Thiruvananthapuram, and Hyderabad.
            </p>

            {/* Core Value Highlights from hiredassist.in */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-100)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Car size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Experienced Drivers
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Trained and skilled drivers for safe rides
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-100)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Flexible Scheduling
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Schedule your ride anytime, anywhere
                  </p>
                </div>
              </div>
            </div>

            {/* Official Pilot Section */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  backgroundColor: 'var(--primary)',
                }}
              />
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
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Award size={18} color="var(--primary)" /> HireD Pilot Program & Driver Network
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--success)',
                    background: 'var(--success-bg)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Enterprise Tier
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Our <strong>HireD Pilots</strong> are certified, background-checked professional drivers trained
                in defensive driving and executive etiquette. Deploy an on-demand pilot for your corporate fleet
                or request dedicated pilot shifts with zero lock-in.
              </p>

              {/* Official Website Stats */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  paddingTop: '0.85rem',
                  marginTop: '0.85rem',
                  borderTop: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>99.7%</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Customer Satisfaction</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>4x</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Dispatch Speed</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>5000+</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Trusted Clients</div>
                </div>
              </div>
            </div>

            {/* Operational Support & Pilot Helpline */}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <Phone size={14} color="var(--primary)" />
              <span>Pilot Assistance Hotline: <strong>+91 9567 6323 96</strong> / <strong>+91 9633 3317 07</strong></span>
              <span>•</span>
              <span>HQ: Ernakulam, Kerala</span>
            </div>
          </div>

          {/* Right Column: Partner Login Form */}
          <div style={{ width: '100%', maxWidth: '440px', justifySelf: 'center' }}>
            <div
              className="card"
              style={{
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '2rem',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Partner Sign In
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Manage transport orders, view active pilots & statements
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
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Corporate Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '0.875rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      style={{ paddingLeft: '2.5rem' }}
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.375rem',
                    }}
                  >
                    <label htmlFor="password" className="form-label" style={{ marginBottom: 0 }}>
                      Password
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '0.875rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      placeholder="Enter partner credentials"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={lockout.isLocked || isSubmitting}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        padding: '0.25rem',
                        cursor: 'pointer',
                      }}
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
                      <span>Sign In to Portal</span>
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
                  backgroundColor: 'var(--primary-50)',
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
                    Enterprise Partner: Apex Global Logistics (ID #101)
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Isolation Guarantee Note */}
            <div
              style={{
                marginTop: '1.25rem',
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
              <span>Strict Tenant Isolation • Company #101 Data Partitioning</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
