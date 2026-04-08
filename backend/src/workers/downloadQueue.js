const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../utils/logger');

const connection = {
  host: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const match = url.match(/redis:\/\/(?::.*@)?([^:]+)(?::(\d+))?/);
    return match?.[1] || 'localhost';
  })(),
  port: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const match = url.match(/:(\d+)(?:\/|$)/);
    return parseInt(match?.[1]) || 6379;
  })(),
  password: (() => {
    const url = process.env.REDIS_URL || '';
    const match = url.match(/redis:\/\/:(.+)@/);
    return match?.[1] || undefined;
  })(),
};

// ── Queues ─────────────────────────────────────────────────────────────
const downloadQueue = new Queue('downloads', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 50, age: 7 * 24 * 3600 },
  },
});

const encodingQueue = new Queue('encoding', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  },
});

const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { count: 10 },
  },
});

// ── Queue Events (for monitoring) ─────────────────────────────────────
const downloadEvents = new QueueEvents('downloads', { connection });

downloadEvents.on('completed', ({ jobId }) => {
  logger.info(`Download job ${jobId} completed`);
});

downloadEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Download job ${jobId} failed: ${failedReason}`);
});

downloadEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Download job ${jobId} progress: ${JSON.stringify(data)}`);
});

module.exports = { downloadQueue, encodingQueue, notificationQueue };
