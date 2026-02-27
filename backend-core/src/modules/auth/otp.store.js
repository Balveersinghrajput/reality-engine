const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });

client.connect().catch(err => console.error('Redis OTP store connection error:', err));

const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtp(email, otp) {
  await client.set(`otp:${email.toLowerCase()}`, otp, { EX: OTP_EXPIRY_SECONDS });
}

async function verifyOtp(email, otp) {
  const stored = await client.get(`otp:${email.toLowerCase()}`);
  if (!stored) return { valid: false, reason: 'OTP not found or expired. Please request a new one.' };
  if (stored !== otp) return { valid: false, reason: 'Invalid OTP.' };
  return { valid: true };
}

async function clearOtp(email) {
  await client.del(`otp:${email.toLowerCase()}`);
}

module.exports = { generateOtp, saveOtp, verifyOtp, clearOtp };