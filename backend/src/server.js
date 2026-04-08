/**
 * AnimaVault Backend — Main Server
 * Express + Socket.IO + MongoDB + Redis
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const socketHandler = require('./config/socket');

// ── Routes ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const animeRoutes = require('./routes/anime');
const episodeRoutes = require('./routes/episodes');
const downloadRoutes = require('./routes/downloads');
const streamRoutes = require('./routes/stream');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const taskRoutes = require('./routes/tasks');

const app = express();
const server = http.createServer(app);

// ── Socket.IO Setup ────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible globally
app.set('io', io);
global.io = io;

// ── Security Middleware ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(mongoSanitize());
app.use(hpp());

// ── General Middleware ─────────────────────────────────────────────────
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Rate Limiting ──────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ── Static Files ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
}));

// ── Health Check ───────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// ── API Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);

// ── Error Handling ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.IO Event Handlers ───────────────────────────────────────────
socketHandler(io);

// ── Startup ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    server.listen(PORT, () => {
      logger.info(`🚀 AnimaVault API running on port ${PORT}`);
      logger.info(`📡 Socket.IO ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

module.exports = { app, server, io };
