import mongoose from 'mongoose';
import { env } from './env';
import logger from '../utils/logger';

export const connectDB = async () => {
  try {
    // connect to mongodb.
    // mongoose maintains a default connection pool.
    // the options used to be required (useNewUrlParser, etc.) but are now default in Mongoose 6+.
    await mongoose.connect(env.MONGO_URI);
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed due to app termination');
  process.exit(0);
});
