module.exports = function errorMiddleware(err, _req, res, _next) {
    const isDev = process.env.NODE_ENV !== 'production';
    console.error('[ai-service error]', err.message);
    if (err?.status === 429) return res.status(429).json({ success: false, message: 'AI rate limit reached. Try again in a moment.' });
    if (err?.status === 401 || err?.code === 'invalid_api_key') return res.status(500).json({ success: false, message: 'AI service misconfigured.' });
    if (err.message?.startsWith('AI returned invalid JSON')) return res.status(502).json({ success: false, message: 'AI returned unexpected format. Try again.' });
    res.status(500).json({ success: false, message: 'AI service error. Please try again.', ...(isDev ? { detail: err.message } : {}) });
  };