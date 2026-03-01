require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { rateLimiter }     = require('./middlewares/rateLimiter.middleware');

const authRoutes          = require('./modules/auth/auth.routes');
const userRoutes          = require('./modules/user/user.routes');
const taskRoutes          = require('./modules/task/task.routes');
const testRoutes          = require('./modules/test/test.routes');
const leaderboardRoutes   = require('./modules/leaderboard/leaderboard.routes');
const connectionsRoutes   = require('./modules/connections/connections.routes');
const groupsRoutes        = require('./modules/groups/groups.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const harshRoutes         = require('./modules/harshMode/harsh.routes');
const realityRoutes       = require('./modules/realityScore/reality.routes');
const aiRoutes            = require('./modules/ai/ai.routes');
const chatRoutes          = require('./features/chat/chat.routes');

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth',         authRoutes);
app.use('/api/user',         userRoutes);
app.use('/api/tasks',        taskRoutes);        // ✅ registered once
app.use('/api/tests',        testRoutes);
app.use('/api/leaderboard',  leaderboardRoutes);
app.use('/api/connections',  connectionsRoutes);
app.use('/api/groups',       groupsRoutes);
app.use('/api/notifications',notificationsRoutes);
app.use('/api/harsh',        harshRoutes);
app.use('/api/reality-score',realityRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/chat',         chatRoutes);

app.use(errorMiddleware);

module.exports = app;