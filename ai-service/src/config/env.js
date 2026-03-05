const optional = (name, fallback = '') => process.env[name] ?? fallback;
module.exports = {
  SERVICE_NAME:      optional('SERVICE_NAME',      'ai-service'),
  PORT:              optional('PORT',              '5002'),
  NODE_ENV:          optional('NODE_ENV',          'development'),
  OPENAI_API_KEY:    optional('OPENAI_API_KEY',    ''),
  OPENAI_BASE_URL:   optional('OPENAI_BASE_URL',   'https://api.groq.com/openai/v1'),
  OPENAI_MODEL:      optional('OPENAI_MODEL',      'llama-3.3-70b-versatile'),
  OPENAI_MAX_TOKENS: parseInt(optional('OPENAI_MAX_TOKENS', '2048'), 10),
  INTERNAL_SECRET:   optional('INTERNAL_SECRET',   'dev-internal-secret'),
  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  RATE_LIMIT_MAX:       parseInt(optional('RATE_LIMIT_MAX',       '30'),    10),
  CORS_ORIGIN:       optional('CORS_ORIGIN',       'http://localhost:3000'),
};