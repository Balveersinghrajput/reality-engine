const { z } = require('zod');

const TRACKS = ['webdev', 'cloud', 'cyber', 'ai', 'devops', 'fullstack', 'system_design', 'robotics'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const MODES  = ['normal', 'competitive', 'harsh'];

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const registerSchema = z.object({
  username:    z.string().min(3, 'Username must be at least 3 characters'),
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  targetTrack: z.enum(TRACKS),
  level:       z.enum(LEVELS),
  mode:        z.enum(MODES),
  otp:         z.string().length(6, 'OTP must be 6 digits'),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ✅ otp removed — password reset no longer needs OTP (already verified in verify-otp step)
const resetPasswordSchema = z.object({
  email:       z.string().email('Invalid email address'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

module.exports = { sendOtpSchema, registerSchema, loginSchema, refreshSchema, resetPasswordSchema };