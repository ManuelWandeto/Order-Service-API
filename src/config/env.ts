import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Only load .env file if it exists (for local development)
// In Docker, environment variables are passed via docker-compose
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  PORT: z.string().default('3000'),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

export const env = envVars.data;
