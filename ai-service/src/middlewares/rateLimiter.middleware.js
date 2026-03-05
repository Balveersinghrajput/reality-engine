const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../config/env');

const make = (windowMs, max, msg) => rateLimit({
  windowMs, max,
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => res.status(429).json({ success: false, message: msg }),
});

module.exports = {
  generalLimiter:    make(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX,  'Too many requests. Limit: ' + RATE_LIMIT_MAX + '/min.'),
  strictLimiter:     make(5 * 60 * 1000,        10,              'Max 10 requests per 5 minutes for this feature.'),
  codeReviewLimiter: make(60 * 1000,             15,             'Code review limit: max 15/min.'),
};