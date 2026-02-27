const authService = require('./auth.service');
const { registerSchema, loginSchema, refreshSchema, sendOtpSchema, resetPasswordSchema } = require('./auth.validation');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function sendOtpController(req, res, next) {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const result = await authService.sendOtp({ email });
    return successResponse(res, result, 'OTP sent successfully');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function sendForgotPasswordOtpController(req, res, next) {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const result = await authService.sendForgotPasswordOtp({ email });
    return successResponse(res, result, 'OTP sent successfully');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function registerController(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    return successResponse(res, result, 'Registration successful', 201);
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function loginController(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    return successResponse(res, result, 'Login successful');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function resetPasswordController(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(data);
    return successResponse(res, result, 'Password reset successful');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function refreshController(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refreshToken(refreshToken);
    return successResponse(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

async function getMeController(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, user, 'User fetched');
  } catch (err) {
    next(err);
  }
}

async function logoutController(req, res) {
  return successResponse(res, null, 'Logged out successfully');
}

module.exports = {
  sendOtpController,
  sendForgotPasswordOtpController,
  registerController,
  loginController,
  resetPasswordController,
  refreshController,
  getMeController,
  logoutController,
};