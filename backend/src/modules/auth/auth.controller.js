import {
  loginUser,
  refreshUserSession,
  logoutUser
} from './auth.service.js';
import { verifyAccessToken } from '../../shared/security.js';
import {
  submitPartnerRegistration,
  setupPasswordWithToken
} from '../onboarding/onboarding.service.js';
import {
  requestEmailOtp,
  verifyEmailOtp,
  registerCompanyWithOtp,
  resetPasswordWithOtp as resetPasswordService
} from './emailOtp.service.js';
import { successResponse, errorResponse } from '../../shared/response.js';

function isApiV1(req) {
  return req.originalUrl?.startsWith('/api/v1') || req.baseUrl?.startsWith('/api/v1');
}

// Helper to set HTTP-only cookie if desired by web clients
function setRefreshTokenCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

export async function adminLogin(req, res, next) {
  try {
    const email = req.body.email_id || req.body.email;
    const password = req.body.password;

    const result = await loginUser({
      identityType: 'ADMIN',
      identifier: email,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refresh_token || result.refreshToken);

    if (isApiV1(req)) {
      return successResponse(
        res,
        200,
        {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          user_type: result.user_type,
          user: result.user
        },
        'Login successful.'
      );
    }

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Authentication error.'
      });
    }
  }
}

export async function partnerLogin(req, res, next) {
  try {
    const email = req.body.email_id || req.body.email;
    const password = req.body.password;

    const result = await loginUser({
      identityType: 'PARTNER',
      identifier: email,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refresh_token || result.refreshToken);

    if (isApiV1(req)) {
      return successResponse(
        res,
        200,
        {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          user_type: result.user_type,
          user: result.user
        },
        'Login successful.'
      );
    }

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Authentication error.'
      });
    }
  }
}

export async function driverLogin(req, res, next) {
  try {
    const phoneNo = req.body.phone_no || req.body.phoneNo || req.body.phone;
    const password = req.body.password;

    const result = await loginUser({
      identityType: 'DRIVER',
      identifier: phoneNo,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refresh_token || result.refreshToken);

    if (isApiV1(req)) {
      return successResponse(
        res,
        200,
        {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          user_type: result.user_type,
          user: result.user
        },
        'Login successful.'
      );
    }

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Authentication error.'
      });
    }
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = req.body.refresh_token || req.body.refreshToken || req.cookies?.refreshToken;
    const result = await refreshUserSession(token, req.ip);

    setRefreshTokenCookie(res, result.refresh_token || result.refreshToken);

    if (isApiV1(req)) {
      return successResponse(
        res,
        200,
        {
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in
        },
        'Token refreshed.'
      );
    }

    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Refresh error.'
      });
    }
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.body.refresh_token || req.body.refreshToken || req.cookies?.refreshToken;
    let sessionId = req.user?.sessionId;

    if (!sessionId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const decoded = verifyAccessToken(req.headers.authorization.split(' ')[1]);
        sessionId = decoded?.sessionId;
      } catch (e) {}
    }

    await logoutUser(token, sessionId);
    clearRefreshTokenCookie(res);

    if (isApiV1(req)) {
      return res.status(204).send();
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Logged out successfully.'
    });
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Logout error.'
      });
    }
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    status: 'ok',
    data: {
      user: req.user.profile,
      sessionId: req.user.sessionId
    }
  });
}

export async function partnerRegister(req, res) {
  try {
    const result = await submitPartnerRegistration(req.body);
    return res.status(201).json({
      status: 'ok',
      message: 'Partner registration request submitted successfully. Our team will review your application shortly.',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Send an email OTP (Pillars 3, 4, 5: 10m expiry, SHA-256, 60s cooldown).
 */
export async function sendOtp(req, res, next) {
  try {
    const email = req.body.email || req.body.email_id;
    const purpose = req.body.purpose || (req.path.includes('forgot-password') ? 'PASSWORD_RESET' : 'EMAIL_VERIFY');

    const result = await requestEmailOtp({ email, purpose });
    return res.status(200).json({
      status: 'ok',
      success: true,
      message: result.message,
      expires_in: result.expiresInSeconds,
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      success: false,
      message: err.message || 'Failed to send verification code.'
    });
  }
}

/**
 * Verify an email OTP (Pillars 1, 2: max 3 attempts, purpose isolation).
 */
export async function verifyOtp(req, res, next) {
  try {
    const email = req.body.email || req.body.email_id;
    const otp = req.body.otp || req.body.code;
    const purpose = req.body.purpose || 'EMAIL_VERIFY';

    await verifyEmailOtp({ email, otp, purpose });
    return res.status(200).json({
      status: 'ok',
      success: true,
      message: 'Verification code verified successfully.'
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      success: false,
      message: err.message || 'Verification failed.'
    });
  }
}

/**
 * Register account with verified OTP.
 */
export async function registerWithOtp(req, res, next) {
  try {
    const companyName = req.body.company_name || req.body.companyName || req.body.name;
    const contactPerson = req.body.contact_person || req.body.contactPerson;
    const phoneNo = req.body.phone_no || req.body.phoneNo || req.body.phone;
    const email = req.body.email_id || req.body.email;
    const password = req.body.password;
    const otp = req.body.otp || req.body.code;

    const result = await registerCompanyWithOtp({
      companyName,
      contactPerson,
      phoneNo,
      email,
      password,
      otp,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refresh_token);

    return res.status(201).json({
      status: 'ok',
      success: true,
      message: result.message,
      ...result
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      success: false,
      message: err.message || 'Registration failed.'
    });
  }
}

/**
 * Reset password using OTP.
 */
export async function resetPasswordWithOtp(req, res, next) {
  try {
    const email = req.body.email_id || req.body.email;
    const otp = req.body.otp || req.body.code;
    const newPassword = req.body.new_password || req.body.newPassword || req.body.password;

    const result = await resetPasswordService({
      email,
      otp,
      newPassword
    });

    return res.status(200).json({
      status: 'ok',
      success: true,
      message: result.message
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      success: false,
      message: err.message || 'Password reset failed.'
    });
  }
}

export async function setupPartnerPassword(req, res) {
  try {
    const { token, password } = req.body;
    await setupPasswordWithToken({ userType: 'PARTNER', token, password });
    return res.status(200).json({
      status: 'ok',
      message: 'Password established successfully. You may now log in with your credentials.'
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message
    });
  }
}

export async function setupDriverPassword(req, res) {
  try {
    const { token, password } = req.body;
    await setupPasswordWithToken({ userType: 'DRIVER', token, password });
    return res.status(200).json({
      status: 'ok',
      message: 'Password established successfully. You may now log in with your credentials.'
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Unified login endpoint supporting B2B portal, Driver mobile app, and Admin web portal.
 * Handles POST /auth/login and POST /api/v1/auth/login with { email/phone, password, user_type }
 */
export async function unifiedLogin(req, res, next) {
  try {
    const rawUserType = req.body.user_type || req.body.userType || req.body.identityType || '';
    let userType = rawUserType.toUpperCase();

    // Auto-detect role if not explicitly provided
    if (!userType) {
      if (req.body.phone || req.body.phone_no || req.body.phoneNo) {
        userType = 'DRIVER';
      } else {
        userType = 'PARTNER';
      }
    }

    const identifier = userType === 'DRIVER'
      ? (req.body.phone || req.body.phone_no || req.body.phoneNo || req.body.identifier)
      : (req.body.email || req.body.email_id || req.body.identifier);
    const password = req.body.password;

    const result = await loginUser({
      identityType: userType,
      identifier,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refresh_token || result.refreshToken);

    const enhancedUser = {
      ...result.user,
      ...(userType === 'PARTNER' ? { company_id: result.user.companyId || result.user.user_id } : {}),
      ...(userType === 'DRIVER' ? { driver_id: result.user.driverId || result.user.user_id } : {})
    };

    const responsePayload = {
      success: true,
      token: result.access_token,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      token_type: result.token_type,
      expires_in: result.expires_in,
      user_type: result.user_type,
      user: enhancedUser,
      ...(userType === 'PARTNER' ? { company: enhancedUser } : {}),
      ...(userType === 'DRIVER' ? { driver: enhancedUser } : {}),
      data: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        user_type: result.user_type,
        user: enhancedUser,
        ...(userType === 'PARTNER' ? { company: enhancedUser } : {}),
        ...(userType === 'DRIVER' ? { driver: enhancedUser } : {})
      },
      message: 'Login successful.'
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    if (isApiV1(req)) {
      next(err);
    } else {
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Authentication error.'
      });
    }
  }
}
