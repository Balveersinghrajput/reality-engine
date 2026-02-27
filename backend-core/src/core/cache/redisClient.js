const { createClient } = require('redis');
const logger = require('../logger/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) return false;
      return Math.min(retries * 200, 2000);
    },
  },
});

redisClient.on('error', (err) => logger.error('Redis error: ' + err.message));
redisClient.on('connect', () => logger.info('✅ Redis connected'));

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('❌ Redis failed: ' + err.message);
  }
}

module.exports = { redisClient, connectRedis };