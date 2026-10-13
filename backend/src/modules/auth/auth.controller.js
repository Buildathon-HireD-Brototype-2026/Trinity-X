import {
  loginUser,
  refreshUserSession,
  logoutUser
} from './auth.service.js';
import {
  submitPartnerRegistration,
  setupPasswordWithToken
} from '../onboarding/onboarding.service.js';

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

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({
      identityType: 'ADMIN',
      identifier: email,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refreshToken);
    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Authentication error.'
    });
  }
}

export async function partnerLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser({
      identityType: 'PARTNER',
      identifier: email,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refreshToken);
    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Authentication error.'
    });
  }
}

export async function driverLogin(req, res) {
  try {
    const { phoneNo, password } = req.body;
    const result = await loginUser({
      identityType: 'DRIVER',
      identifier: phoneNo,
      password,
      ipAddress: req.ip
    });

    setRefreshTokenCookie(res, result.refreshToken);
    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Authentication error.'
    });
  }
}

export async function refreshToken(req, res) {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    const result = await refreshUserSession(token, req.ip);

    setRefreshTokenCookie(res, result.refreshToken);
    return res.status(200).json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    clearRefreshTokenCookie(res);
    const statusCode = err.status || 401;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Session refresh failed.'
    });
  }
}

export async function logout(req, res) {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    await logoutUser(token);
    clearRefreshTokenCookie(res);
    return res.status(200).json({
      status: 'ok',
      message: 'Logged out successfully.'
    });
  } catch (err) {
    clearRefreshTokenCookie(res);
    return res.status(200).json({
      status: 'ok',
      message: 'Logged out.'
    });
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
      message: result.message,
      data: { requestId: result.requestId }
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Registration failed.'
    });
  }
}

export async function setupPartnerPassword(req, res) {
  try {
    const { token, password } = req.body;
    const result = await setupPasswordWithToken({ token, newPassword: password });
    return res.status(200).json({
      status: 'ok',
      message: result.message
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Password setup failed.'
    });
  }
}

export async function setupDriverPassword(req, res) {
  try {
    const { token, password } = req.body;
    const result = await setupPasswordWithToken({ token, newPassword: password });
    return res.status(200).json({
      status: 'ok',
      message: result.message
    });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Password setup failed.'
    });
  }
}
