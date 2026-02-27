const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../core/database/prismaClient');
const { generateOtp, saveOtp, verifyOtp, clearOtp } = require('./otp.store');
const { sendOtpEmail } = require('../../utils/mailer');

// ── Generate Tokens ──────────────────────────
function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// ── Assign Batch ─────────────────────────────
async function assignBatch(userId, targetTrack, level) {
  const now = new Date();
  const week = `Week${Math.ceil(now.getDate() / 7)}`;
  const month = now.toLocaleString('default', { month: 'long' });
  const batchCode = `${targetTrack}_${level}_${month}_${week}`.toUpperCase();

  let batch = await prisma.batch.findUnique({ where: { batchCode } });

  if (!batch) {
    batch = await prisma.batch.create({
      data: { batchCode, targetTrack, level, startWeek: `${month}_${week}` },
    });
  }

  await prisma.batchMember.create({
    data: { userId, batchId: batch.id },
  });

  return batch;
}

// ── Send OTP (Register flow) ──────────────────
async function sendOtp({ email }) {
  const otp = generateOtp();
  await saveOtp(email, otp);
  await sendOtpEmail(email, otp);
  return { message: 'OTP sent successfully' };
}

// ── Send OTP (Forgot Password — email must exist) ──
async function sendForgotPasswordOtp({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { status: 404, message: 'No account found with this email' };

  const otp = generateOtp();
  await saveOtp(email, otp);
  await sendOtpEmail(email, otp);
  return { message: 'OTP sent successfully' };
}

// ── Register (with OTP verification) ──────────
async function register(data) {
  const { username, email, password, targetTrack, level, mode, otp } = data;

  const { valid, reason } = await verifyOtp(email, otp);
  if (!valid) throw { status: 400, message: reason };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    const field = existing.email === email ? 'Email' : 'Username';
    throw { status: 409, message: `${field} already exists` };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, passwordHash, targetTrack, level, mode },
  });

  await clearOtp(email);

  const batch = await assignBatch(user.id, targetTrack, level);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      targetTrack: user.targetTrack,
      level: user.level,
      mode: user.mode,
      tier: user.tier,
    },
    batch: { id: batch.id, batchCode: batch.batchCode },
    accessToken,
    refreshToken,
  };
}

// ── Login ─────────────────────────────────────
async function login(data) {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { batchMember: { include: { batch: true } } },
  });

  if (!user) throw { status: 401, message: 'Invalid email or password' };

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw { status: 401, message: 'Invalid email or password' };

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      targetTrack: user.targetTrack,
      level: user.level,
      mode: user.mode,
      tier: user.tier,
      masteryPercent: user.masteryPercent,
      realityScore: user.realityScore,
      streakCurrent: user.streakCurrent,
      batchId: user.batchMember?.batchId,
      batchCode: user.batchMember?.batch?.batchCode,
    },
    accessToken,
    refreshToken,
  };
}

// ── Reset Password ────────────────────────────
// ✅ No OTP verification here — already verified in /verify-otp step
async function resetPassword({ email, newPassword }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { status: 404, message: 'User not found' };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  return { message: 'Password updated successfully' };
}

// ── Refresh Token ─────────────────────────────
async function refreshToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw { status: 401, message: 'User not found' };

    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    throw { status: 401, message: 'Invalid refresh token' };
  }
}

// ── Get Me ────────────────────────────────────
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      profilePic: true,
      targetTrack: true,
      level: true,
      mode: true,
      tier: true,
      masteryPercent: true,
      realityScore: true,
      streakCurrent: true,
      streakLongest: true,
      createdAt: true,
      batchMember: { include: { batch: true } },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };
  return user;
}

module.exports = { sendOtp, sendForgotPasswordOtp, register, login, resetPassword, refreshToken, getMe };