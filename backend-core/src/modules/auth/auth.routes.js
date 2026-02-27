const express = require('express');
const router = express.Router();
const {
  sendOtpController,
  sendForgotPasswordOtpController,
  registerController,
  loginController,
  resetPasswordController,
  refreshController,
  getMeController,
  logoutController,
} = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

// ── OTP ──────────────────────────────────────
router.post('/send-otp', sendOtpController);                      // Register flow: send OTP to any email
router.post('/forgot-password', sendForgotPasswordOtpController); // Forgot flow: send OTP (email must exist)
router.post('/reset-password', resetPasswordController);           // Forgot flow: verify OTP + set new password

// ── Auth ─────────────────────────────────────
router.post('/register', registerController);  // Requires otp field in body now
router.post('/login', loginController);
router.post('/refresh', refreshController);

// ── Protected ────────────────────────────────
router.get('/me', authMiddleware, getMeController);
router.post('/logout', authMiddleware, logoutController);

module.exports = router;