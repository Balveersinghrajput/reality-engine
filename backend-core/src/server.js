require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./sockets/index');
const { connectRedis } = require('./core/cache/redisClient');
const { connectDB } = require('./core/database/prismaClient');
const { startRankJob } = require('./jobs/rankRecalculation.job');
const logger = require('./core/logger/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    startRankJob();
    server.listen(PORT, () => {
      logger.info(`🚀 Backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start: ' + err.message);
    process.exit(1);
  }
}

startServer();