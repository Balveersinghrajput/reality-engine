const ts  = () => new Date().toISOString();
module.exports = {
  info:  (m) => console.log('[INFO]  ' + ts() + ' ' + m),
  warn:  (m) => console.warn('[WARN]  ' + ts() + ' ' + m),
  error: (m) => console.error('[ERROR] ' + ts() + ' ' + m),
};