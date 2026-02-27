const { PrismaClient } = require('@prisma/client');
const logger = require('../logger/logger');

const prisma = new PrismaClient({ log: ['error'] });

async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (err) {
    logger.error('❌ PostgreSQL connection failed: ' + err.message);
    throw err;
  }
}

module.exports = { prisma, connectDB };