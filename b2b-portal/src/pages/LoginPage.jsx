import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
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
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  ExternalLink,
  Building2,
  User,
  Phone,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import ClayDrivingScene from '../components/common/ClayDrivingScene';
import { validateLoginFields, getFriendlyErrorMessage } from '../utils/errorHandler';

const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export function LoginPage({ initialMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { showSuccess, showError } = useToast();

  // Determine initial mode: 'login' | 'register' | 'forgot'
  const determineInitialMode = () => {
    if (initialMode) return initialMode;
    if (location.pathname === '/register') return 'register';
    if (location.pathname === '/forgot-password') return 'forgot';
    return 'login';
  };

  const [mode, setMode] = useState(determineInitialMode);

  // Sync mode with route changes
  useEffect(() => {
    if (location.pathname === '/register') setMode('register');
    else if (location.pathname === '/forgot-password') setMode('forgot');
    else if (location.pathname === '/login') setMode('login');
  }, [location.pathname]);

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockout, setLockout] = useState({ isLocked: false, remainingSeconds: 0 });

  // Registration state
  const [regCompany, setRegCompany] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOtpStep, setRegOtpStep] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [regResendTimer, setRegResendTimer] = useState(0);
  const [regErrors, setRegErrors] = useState({});
  const [regGeneralError, setRegGeneralError] = useState('');

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Check for expired session query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired') === 'true' || location.state?.expired) {
      setError('Your session has expired. Please log in again.');
    }
  }, [location]);

  // Clear any legacy client-side lockout on mount
  useEffect(() => {
    authService.resetAttempts();
    setLockout({ isLocked: false, remainingSeconds: 0 });
  }, []);

  // Registration OTP resend countdown
  useEffect(() => {
    if (regResendTimer > 0) {
      const timer = setTimeout(() => setRegResendTimer(regResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [regResendTimer]);

  // Forgot Password OTP resend countdown
  useEffect(() => {
    if (forgotResendTimer > 0) {
      const timer = setTimeout(() => setForgotResendTimer(forgotResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotResendTimer]);

  // Handle mode switch cleanly
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setRegGeneralError('');
    setRegErrors({});
    setRegOtpStep(false);
    setRegOtp('');
    setForgotError('');
    setForgotSuccess('');
    setForgotOtpSent(false);
  };

  // Sign In submit handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validation = validateLoginFields(email, password);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true });
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, 'login');
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registration - Step 1: Validate fields & request email OTP
  const handleRegisterInitiate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setRegGeneralError('');
    const errors = {};

    if (!regCompany.trim()) errors.company = 'Company name is required.';
    if (!regContact.trim()) errors.contact = 'Contact person name is required.';
    if (!regPhone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (regPhone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Please enter a valid 10-digit phone number.';
    }
    if (!regEmail.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!regPassword) {
      errors.password = 'Password is required.';
    } else if (regPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    // Instantly advance to the OTP entering screen so user never waits!
    setRegOtpStep(true);
    setRegResendTimer(60); // 60s cooldown before resend
    setIsSubmitting(true);

    try {
      await authService.sendRegisterOtp(regEmail);
      showSuccess(`Verification code sent to ${regEmail}.`);
    } catch (err) {
      const msg = err.message || getFriendlyErrorMessage(err, 'register');
      // If code was already sent or active in 10-minute window, keep user on OTP screen!
      if (
        typeof msg === 'string' &&
        (msg.toLowerCase().includes('wait') ||
          msg.toLowerCase().includes('second') ||
          msg.toLowerCase().includes('already') ||
          msg.toLowerCase().includes('valid') ||
          msg.toLowerCase().includes('taking too long'))
      ) {
        const matchSec = msg.match(/(\d+)\s*seconds/i);
        if (matchSec) {
          setRegResendTimer(parseInt(matchSec[1], 10));
        }
        setRegGeneralError(msg);
      } else {
        // If domain validation or duplicate email error, return to Step 1 to let them edit
        setRegOtpStep(false);
        setRegGeneralError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // Registration - Step 2: Verify OTP & complete account creation
  const handleRegisterVerifyAndComplete = async (e) => {
    e.preventDefault();
    setRegGeneralError('');

    if (!regOtp.trim()) {
      setRegGeneralError('Please enter the 6-digit verification code.');
      return;
    }
    if (regOtp.trim().length !== 6) {
      setRegGeneralError('Verification code must be 6 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create verified account in database with chosen password
      await authService.register({
        companyName: regCompany,
        contactPerson: regContact,
        phoneNo: regPhone,
        email: regEmail,
        password: regPassword,
        otp: regOtp.trim(),
      });

      showSuccess('Account created successfully! Signing you in...');
      // Auto-login with the newly created verified credentials
      try {
        await login(regEmail, regPassword);
        navigate('/', { replace: true });
      } catch {
        setEmail(regEmail);
        switchMode('login');
      }
    } catch (err) {
      const msg = err.message || getFriendlyErrorMessage(err, 'register');
      setRegGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }

  };

  // Forgot password - Step 1: Send OTP
  const handleSendForgotOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    // Instantly advance to the OTP entering screen so user never waits!
    setForgotOtpSent(true);
    setForgotResendTimer(60); // 60s cooldown before resend
    setIsSubmitting(true);

    try {
      await authService.sendForgotPasswordOtp(forgotEmail);
      setForgotSuccess(`Verification code sent to ${forgotEmail}. Please check your inbox.`);
    } catch (err) {
      const friendly = err.message || getFriendlyErrorMessage(err, 'forgot_password');
      if (
        typeof friendly === 'string' &&
        (friendly.toLowerCase().includes('wait') ||
          friendly.toLowerCase().includes('second') ||
          friendly.toLowerCase().includes('already') ||
          friendly.toLowerCase().includes('valid') ||
          friendly.toLowerCase().includes('taking too long'))
      ) {
        const matchSec = friendly.match(/(\d+)\s*seconds/i);
        if (matchSec) {
          setForgotResendTimer(parseInt(matchSec[1], 10));
        }
        setForgotError(friendly);
      } else {
        // Return to Step 1 if account was not found
        setForgotOtpSent(false);
        setForgotError(friendly);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password - Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (forgotOtp.trim().length !== 6) {
      setForgotError('Verification code must be 6 digits.');
      return;
    }
    if (!newPassword) {
      setForgotError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPasswordWithOtp({
        email: forgotEmail,
        otp: forgotOtp.trim(),
        newPassword,
      });

      showSuccess('Password updated successfully. You can now sign in.');
      setEmail(forgotEmail);
      setPassword('');
      switchMode('login');
    } catch (err) {
      const msg = err.message || getFriendlyErrorMessage(err, 'reset_password');
      setForgotError(msg);
    } finally {
      setIsSubmitting(false);
    }

  };

  const handleFillDemo = () => {
    setEmail('test-company@example.com');
    setPassword('Partner@123');
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
      {/* Top Header Bar */}
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
          <img src="/logo.png" alt="HireD Logo" style={{ height: '36px', width: 'auto' }} />
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
          {/* Left Column: 3D Clay Driving Scene Showcase */}
          <div className="login-left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto 0.25rem 0' }}>
              <ClayDrivingScene />
            </div>

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
                  marginBottom: '0.875rem',
                }}
              >
                Trust in every kilometre
              </div>

              <h1
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.875rem',
                }}
              >
                Your trusted <br />
                <span style={{ color: 'var(--primary)' }}>driving partner.</span>
              </h1>

              <p
                style={{
                  fontSize: '0.975rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                Request professional drivers for your team, follow every order and trip, and keep your reports and statements in one place.
              </p>
            </div>
          </div>

          {/* Right Column: Clean Form Card (No top tab container switch) */}
          <div style={{ width: '100%', maxWidth: '460px', justifySelf: 'center' }}>
            <div
              className="card"
              style={{
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '2.25rem',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {/* Back button when in Forgot Password mode */}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'transparent',
                    border: 'none',
                    padding: '0 0 1rem 0',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </button>
              )}

              {/* Mode Header */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {mode === 'login' && 'Partner Sign In'}
                  {mode === 'register' && (regOtpStep ? 'Verify Email Address' : 'Create Account')}
                  {mode === 'forgot' && 'Reset Password'}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {mode === 'login' && 'Manage transport bookings, view live drivers & statements'}
                  {mode === 'register' && (regOtpStep ? `Enter the 6-digit code sent to ${regEmail}` : 'Set up your account to request drivers and track trips')}
                  {mode === 'forgot' && (forgotOtpSent ? 'Enter the 6-digit code and your new password' : 'Enter your registered email to receive a verification code')}
                </p>
              </div>

              {/* -------------------- MODE: SIGN IN -------------------- */}
              {mode === 'login' && (
                <>
                  {/* Standard Error Notice */}
                  {error && (
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


                  <form onSubmit={handleLoginSubmit} noValidate>
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
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={isSubmitting}
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
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Forgot Password?
                        </button>
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
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={isSubmitting}
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
                            background: 'transparent',
                            border: 'none',
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
                      disabled={isSubmitting}
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

                  {/* Clean Bottom Question Link */}
                  <div
                    style={{
                      marginTop: '1.5rem',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.875rem',
                      }}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Demo Helper Box */}
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.875rem 1rem',
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
                        marginBottom: '0.35rem',
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
                          background: 'transparent',
                          border: 'none',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        Auto-fill
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <div>
                        <strong>Email:</strong> <code>test-company@example.com</code>
                      </div>
                      <div>
                        <strong>Password:</strong> <code>Partner@123</code>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* -------------------- MODE: CREATE ACCOUNT -------------------- */}
              {mode === 'register' && (
                <>
                  {regGeneralError && (
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
                      <span>{regGeneralError}</span>
                    </div>
                  )}

                  {!regOtpStep ? (
                    // Step 1: Fill details
                    <form onSubmit={handleRegisterInitiate} noValidate>
                      {/* Company Name */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="regCompany" className="form-label">
                          Company Name
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Building2
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
                            id="regCompany"
                            type="text"
                            className={`form-control ${regErrors.company ? 'input-has-error' : ''}`}
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="e.g. Acme Tech Solutions"
                            value={regCompany}
                            onChange={(e) => {
                              setRegCompany(e.target.value);
                              if (regErrors.company) setRegErrors({ ...regErrors, company: '' });
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        {regErrors.company && <p className="form-field-error">{regErrors.company}</p>}
                      </div>

                      {/* Contact Person */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="regContact" className="form-label">
                          Contact Person
                        </label>
                        <div style={{ position: 'relative' }}>
                          <User
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
                            id="regContact"
                            type="text"
                            className={`form-control ${regErrors.contact ? 'input-has-error' : ''}`}
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Full Name"
                            value={regContact}
                            onChange={(e) => {
                              setRegContact(e.target.value);
                              if (regErrors.contact) setRegErrors({ ...regErrors, contact: '' });
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        {regErrors.contact && <p className="form-field-error">{regErrors.contact}</p>}
                      </div>

                      {/* Phone Number */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="regPhone" className="form-label">
                          Phone Number
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Phone
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
                            id="regPhone"
                            type="tel"
                            className={`form-control ${regErrors.phone ? 'input-has-error' : ''}`}
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="+91 98765 43210"
                            value={regPhone}
                            onChange={(e) => {
                              setRegPhone(e.target.value);
                              if (regErrors.phone) setRegErrors({ ...regErrors, phone: '' });
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        {regErrors.phone && <p className="form-field-error">{regErrors.phone}</p>}
                      </div>

                      {/* Email Address */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="regEmail" className="form-label">
                          Work Email
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
                            id="regEmail"
                            type="email"
                            className={`form-control ${regErrors.email ? 'input-has-error' : ''}`}
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="admin@yourcompany.com"
                            value={regEmail}
                            onChange={(e) => {
                              setRegEmail(e.target.value);
                              if (regErrors.email) setRegErrors({ ...regErrors, email: '' });
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        {regErrors.email && <p className="form-field-error">{regErrors.email}</p>}
                      </div>

                      {/* Password */}
                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="regPassword" className="form-label">
                          Create Password (min. 8 characters)
                        </label>
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
                            id="regPassword"
                            type={showRegPassword ? 'text' : 'password'}
                            className={`form-control ${regErrors.password ? 'input-has-error' : ''}`}
                            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                            placeholder="Choose a strong password"
                            value={regPassword}
                            onChange={(e) => {
                              setRegPassword(e.target.value);
                              if (regErrors.password) setRegErrors({ ...regErrors, password: '' });
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            title={showRegPassword ? 'Hide password' : 'Show password'}
                            style={{
                              position: 'absolute',
                              right: '0.75rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--text-muted)',
                              padding: '0.25rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {regErrors.password && <p className="form-field-error">{regErrors.password}</p>}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', height: '44px' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span>Sending code...</span>
                        ) : (
                          <>
                            <span>Create Account</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>

                      {/* Direct jump to OTP if code was already received in email */}
                      <div style={{ marginTop: '0.875rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!regEmail.trim()) {
                              setRegErrors({ email: 'Please enter your email address above first.' });
                              return;
                            }
                            setRegOtpStep(true);
                            setRegGeneralError('');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Already received your 6-digit code? Enter OTP
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Step 2: Verify OTP
                    <form onSubmit={handleRegisterVerifyAndComplete} noValidate>
                      <div
                        className="notice-box notice-info"
                        style={{ marginBottom: '1.25rem', fontSize: '0.8125rem' }}
                      >
                        <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                        <div>
                          Verification code sent to <strong>{regEmail}</strong>. Please enter the 6-digit code below to complete registration.
                        </div>
                      </div>

                      {/* 6-digit OTP */}
                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="regOtp" className="form-label">
                            6-Digit Verification Code
                          </label>
                          {regResendTimer > 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Resend code in {regResendTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRegisterInitiate}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <KeyRound
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
                            id="regOtp"
                            type="text"
                            maxLength={6}
                            className="form-control"
                            style={{ paddingLeft: '2.5rem', letterSpacing: '0.2em', fontWeight: 700 }}
                            placeholder="123456"
                            value={regOtp}
                            onChange={(e) => {
                              setRegOtp(e.target.value.replace(/\D/g, ''));
                              if (regGeneralError) setRegGeneralError('');
                            }}
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem', marginBottom: 0 }}>
                          Code is valid for 10 minutes. If you requested a new code, please enter the latest one.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', height: '44px' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span>Verifying & creating...</span>
                        ) : (
                          <>
                            <span>Verify & Complete Registration</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>

                      {/* Edit Details Button */}
                      <div style={{ marginTop: '0.875rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setRegOtpStep(false)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <ArrowLeft size={14} />
                          <span>Edit registration details</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Clean Bottom Question Link */}
                  <div
                    style={{
                      marginTop: '1.5rem',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.875rem',
                      }}
                    >
                      Sign In
                    </button>
                  </div>
                </>
              )}

              {/* -------------------- MODE: FORGOT PASSWORD -------------------- */}
              {mode === 'forgot' && (
                <>
                  {forgotError && (
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
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div
                      className="notice-box"
                      style={{
                        backgroundColor: 'var(--success-bg)',
                        borderColor: 'var(--success-border)',
                        color: 'var(--success)',
                        alignItems: 'center',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  {!forgotOtpSent ? (
                    // Step 1: Request OTP
                    <form onSubmit={handleSendForgotOtp} noValidate>
                      <div className="form-group">
                        <label htmlFor="forgotEmail" className="form-label">
                          Registered Email Address
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
                            id="forgotEmail"
                            type="email"
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="partner@company.com"
                            value={forgotEmail}
                            onChange={(e) => {
                              setForgotEmail(e.target.value);
                              if (forgotError) setForgotError('');
                            }}
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem', height: '44px' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span>Sending code...</span>
                        ) : (
                          <>
                            <span>Send Verification Code</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    // Step 2: Verify OTP and Set New Password
                    <form onSubmit={handleResetPassword} noValidate>
                      {/* OTP Field */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="forgotOtp" className="form-label">
                            6-Digit Verification Code
                          </label>
                          {forgotResendTimer > 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Resend code in {forgotResendTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendForgotOtp}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <KeyRound
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
                            id="forgotOtp"
                            type="text"
                            maxLength={6}
                            className="form-control"
                            style={{ paddingLeft: '2.5rem', letterSpacing: '0.2em', fontWeight: 700 }}
                            placeholder="123456"
                            value={forgotOtp}
                            onChange={(e) => {
                              setForgotOtp(e.target.value.replace(/\D/g, ''));
                              if (forgotError) setForgotError('');
                            }}
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem', marginBottom: 0 }}>
                          Code is valid for 10 minutes. If you requested a new code, please enter the latest one.
                        </p>
                      </div>

                      {/* New Password */}
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="newPassword" className="form-label">
                          New Password (min. 8 characters)
                        </label>
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
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            className="form-control"
                            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (forgotError) setForgotError('');
                            }}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            title={showNewPassword ? 'Hide password' : 'Show password'}
                            style={{
                              position: 'absolute',
                              right: '0.75rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--text-muted)',
                              padding: '0.25rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="confirmPassword" className="form-label">
                          Confirm New Password
                        </label>
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
                            id="confirmPassword"
                            type="password"
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (forgotError) setForgotError('');
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* Reset Button */}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', height: '44px' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span>Updating Password...</span>
                        ) : (
                          <>
                            <span>Reset Password</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}
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
              <span>Strict Tenant Isolation • Company Data Partitioning</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
