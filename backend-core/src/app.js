require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');

const app = express();
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL === '*'
  ? true
  : (process.env.CLIENT_URL?.split(',') || ['http://localhost:3000']);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Security & parsing ────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Optional Rate Limiter ─────────────────────────────────────────
try {
  const { rateLimiter } = require('./middlewares/rateLimiter.middleware');
  app.use(rateLimiter);
} catch {
  console.warn('Rate limiter not loaded');
}

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend-core', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',          require('./modules/auth/auth.routes'));
app.use('/api/user',          require('./modules/user/user.routes'));
app.use('/api/tasks',         require('./modules/task/task.routes'));
app.use('/api/tests',         require('./modules/test/test.routes'));
app.use('/api/leaderboard',   require('./modules/leaderboard/leaderboard.routes'));
app.use('/api/connections',   require('./modules/connections/connections.routes'));
app.use('/api/groups',        require('./modules/groups/groups.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/harsh',         require('./modules/harshMode/harsh.routes'));
app.use('/api/reality-score', require('./modules/realityScore/reality.routes'));
app.use('/api/ai',            require('./modules/ai/ai.routes'));
app.use('/api/chat',          require('./features/chat/chat.routes'));

// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

// ── Export ONLY the express app ───────────────────────────────────
module.exports = app;
