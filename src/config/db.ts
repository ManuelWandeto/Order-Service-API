import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async () => {
  try {
    // connect to mongodb.
    // mongoose maintains a default connection pool.
    // the options used to be required (useNewUrlParser, etc.) but are now default in Mongoose 6+.
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});
