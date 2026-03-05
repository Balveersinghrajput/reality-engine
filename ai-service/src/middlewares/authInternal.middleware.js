const { INTERNAL_SECRET } = require('../config/env');

module.exports = function authInternal(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (secret) {
    if (secret !== INTERNAL_SECRET) return res.status(401).json({ success: false, message: 'Invalid internal secret' });
    req.user = {
      id:       req.headers['x-user-id']    || 'unknown',
      username: req.headers['x-user-name']  || 'User',
      tier:     req.headers['x-user-tier']  || 'developing',
      level:    req.headers['x-user-level'] || 'beginner',
      track:    req.headers['x-user-track'] || '',
      mode:     req.headers['x-user-mode']  || 'normal',
    };
    return next();
  }
  // Dev fallback — allow without secret in development
  if (process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev-user', username: 'DevUser', tier: 'developing', level: 'beginner', track: 'software engineering', mode: 'normal' };
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required' });
};