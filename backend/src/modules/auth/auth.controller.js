import {
  loginUser,
  refreshUserSession,
  logoutUser
} from './auth.service.js';
import {
  submitPartnerRegistration,
  setupPasswordWithToken
} from '../onboarding/onboarding.service.js';
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
    const phoneNo = req.body.phone_no || req.body.phoneNo;
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
    const sessionId = req.user?.sessionId;

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
