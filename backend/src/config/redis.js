const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: true,
  });

  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error:', err));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redisClient.connect();
  return redisClient;
}

function getRedis() {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redisClient;
}

module.exports = connectRedis;
module.exports.getRedis = getRedis;
