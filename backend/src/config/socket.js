const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = function socketHandler(io) {
  // ── Auth middleware for socket ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(); // Allow unauthenticated for public rooms
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
    } catch {
      // Token invalid - still allow connection as guest
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId || 'guest'})`);

    // Join personal room for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Subscribe to download task updates
    socket.on('subscribe:task', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('unsubscribe:task', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // Subscribe to anime updates (new episodes)
    socket.on('subscribe:anime', (animeId) => {
      socket.join(`anime:${animeId}`);
    });

    // Admin room
    socket.on('join:admin', () => {
      if (socket.userRole === 'admin') {
        socket.join('admin');
        logger.info(`Admin joined admin room: ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // ── Emit helpers (attached to io for use in controllers) ───────────
  io.emitTaskUpdate = (taskId, data) => {
    io.to(`task:${taskId}`).emit('task:update', data);
  };

  io.emitUserNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification', notification);
  };

  io.emitNewEpisode = (animeId, episode) => {
    io.to(`anime:${animeId}`).emit('new:episode', episode);
    io.emit('new:episode:global', episode); // Broadcast to all
  };

  io.emitAdminEvent = (event, data) => {
    io.to('admin').emit(event, data);
  };
};
