import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

// Test configuration is fixed here so no developer .env can leak into tests.
Object.assign(process.env, {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-long-enough-1234567890',
  FRONTEND_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:4000',
  PAYMENT_PROVIDER: 'mock',
  RAZORPAY_KEY_ID: 'rzp_test_mockkey',
  RAZORPAY_KEY_SECRET: 'test_key_secret',
  RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
  MAIL_TRANSPORT: 'memory',
  UPLOADTHING_TOKEN: '',
  RATE_LIMIT_ENABLED: 'false',
  JOBS_ENABLED: 'false',
  LOG_LEVEL: 'silent',
});

const dbName = `shayara_test_${randomBytes(4).toString('hex')}`;
const baseUri = inject('mongoUri');
const uri = baseUri.replace(/\/(\?|$)/, `/${dbName}$1`);
process.env.MONGODB_URI = uri;

beforeAll(async () => {
  const { connectDatabase } = await import('../config/db');
  await connectDatabase(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  const { getMailer } = await import('../lib/mailer');
  (getMailer() as { clear?: () => void }).clear?.();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
