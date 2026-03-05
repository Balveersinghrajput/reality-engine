const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-service', model: process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile', ts: new Date().toISOString() });
});

app.use('/api/ai',          require('./routes/ai.routes'));
app.use('/api/code-review', require('./routes/codeReview.routes'));
app.use('/api/harsh',       require('./routes/harsh.routes'));
app.use('/api/roadmap',     require('./routes/roadmap.routes'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(require('./middlewares/error.middleware'));

module.exports = app;