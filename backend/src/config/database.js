const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/animavault';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('✅ MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected. Reconnecting...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error:', err);
    });
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    throw err;
  }
}

module.exports = connectDB;
