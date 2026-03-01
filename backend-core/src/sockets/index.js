  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');

  let io;

  // Track online users: userId -> Set of socket IDs (user can have multiple tabs)
  const onlineUsers = new Map();

  function initSocket(httpServer) {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      maxHttpBufferSize: 50e6,
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId || decoded.id;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.userId;

      // Join personal room
      socket.join(`user_${userId}`);

      // ── Track online status ──────────────────────────────────────
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      // Broadcast to everyone that this user is online
      socket.broadcast.emit('user_online', { userId });

      // ── Join / leave conversation rooms ──────────────────────────
      socket.on('join_conversation', (conversationId) => {
        socket.join(`conv_${conversationId}`);
      });

      socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conv_${conversationId}`);
      });

      // ── Typing indicators ────────────────────────────────────────
      socket.on('typing_start', ({ conversationId }) => {
        socket.to(`conv_${conversationId}`).emit('user_typing', { userId, conversationId });
      });

      socket.on('typing_stop', ({ conversationId }) => {
        socket.to(`conv_${conversationId}`).emit('user_stopped_typing', { userId, conversationId });
      });

      // ── Check if a specific user is online (with callback) ───────
      socket.on('check_online', ({ userId: targetId }, callback) => {
        const online = onlineUsers.has(targetId) && onlineUsers.get(targetId).size > 0;
        if (typeof callback === 'function') callback(online);
      });

      // ── Disconnect ───────────────────────────────────────────────
      socket.on('disconnect', () => {
        const sockets = onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            // Broadcast offline only when no more tabs
            socket.broadcast.emit('user_offline', { userId });
          }
        }
      });
    });

    return io;
  }

  function getIO() {
    if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
    return io;
  }

  module.exports = { initSocket, getIO };