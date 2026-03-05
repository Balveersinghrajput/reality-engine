const { createClient } = require('redis');

const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes

// ── In-memory fallback ────────────────────────────────────────────
// Used automatically when Redis is unavailable
const memStore = new Map(); // email → { otp, expiresAt }

function memSave(email, otp) {
  memStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_SECONDS * 1000,
  });
}

function memGet(email) {
  const entry = memStore.get(email.toLowerCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(email.toLowerCase()); return null; }
  return entry.otp;
}

function memDel(email) {
  memStore.delete(email.toLowerCase());
}

// ── Redis client (optional) ───────────────────────────────────────
let redisReady = false;
let client = null;

try {
  if (process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });

    client.on('ready', () => {
      redisReady = true;
      console.log('[otp.store] Redis connected');
    });
    client.on('error', () => {
      redisReady = false;
    });

    // Non-blocking connect — if it fails, we fall back to memory
    client.connect().catch(() => {
      redisReady = false;
      console.warn('[otp.store] Redis unavailable — using in-memory OTP store');
    });
  } else {
    console.warn('[otp.store] REDIS_URL not set — using in-memory OTP store');
  }
} catch {
  console.warn('[otp.store] Redis init failed — using in-memory OTP store');
}

// ── Public API ────────────────────────────────────────────────────
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtp(email, otp) {
  if (redisReady && client) {
    try {
      await client.set(`otp:${email.toLowerCase()}`, otp, { EX: OTP_EXPIRY_SECONDS });
      return;
    } catch {
      redisReady = false;
    }
  }
  memSave(email, otp);
}

async function verifyOtp(email, otp) {
  let stored = null;

  if (redisReady && client) {
    try {
      stored = await client.get(`otp:${email.toLowerCase()}`);
    } catch {
      redisReady = false;
      stored = memGet(email);
    }
  } else {
    stored = memGet(email);
  }

  if (!stored) return { valid: false, reason: 'OTP not found or expired. Please request a new one.' };
  if (stored !== otp) return { valid: false, reason: 'Invalid OTP.' };
  return { valid: true };
}

async function clearOtp(email) {
  if (redisReady && client) {
    try {
      await client.del(`otp:${email.toLowerCase()}`);
      return;
    } catch {
      redisReady = false;
    }
  }
  memDel(email);
}

module.exports = { generateOtp, saveOtp, verifyOtp, clearOtp };