import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
};

startServer();
