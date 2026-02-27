const { Server } = require('socket.io');
const logger = require('../core/logger/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join personal room for notifications
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      logger.info(`User ${userId} joined personal room`);
    });

    socket.on('join_batch', (batchId) => {
      socket.join(`batch_${batchId}`);
    });

    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket not initialized');
  return io;
}

module.exports = { initSocket, getIO };