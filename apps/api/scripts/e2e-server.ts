/**
 * Self-contained API for Playwright end-to-end tests. Starts a throwaway
 * in-memory MongoDB replica set, seeds the sample catalogue and one admin, and
 * serves the real Express app. It never connects to a real database and
 * uses the test-only mock payment gateway and in-memory mailer.
 *
 * Started automatically by apps/web/playwright.config.ts.
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const port = Number(process.env.E2E_API_PORT ?? 4100);
const webUrl = process.env.E2E_WEB_URL ?? 'http://localhost:3100';
export const E2E_ADMIN = { email: 'admin@e2e.shayara.test', password: 'E2eAdminPass123' };

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: String(port),
  MONGODB_URI: replSet.getUri().replace(/\/(\?|$)/, '/shayara_e2e$1'),
  SESSION_SECRET: 'e2e-session-secret-not-for-production-0123456789',
  FRONTEND_URL: webUrl,
  API_BASE_URL: `http://localhost:${port}`,
  PAYMENT_PROVIDER: 'mock',
  RAZORPAY_KEY_ID: 'rzp_test_e2e',
  RAZORPAY_KEY_SECRET: 'e2e_key_secret',
  RAZORPAY_WEBHOOK_SECRET: 'e2e_webhook_secret',
  MAIL_TRANSPORT: 'memory',
  UPLOADTHING_TOKEN: '',
  RATE_LIMIT_ENABLED: 'false',
  JOBS_ENABLED: 'false',
  LOG_LEVEL: 'warn',
  REVALIDATE_SECRET: 'e2e-revalidate-secret-0123456789abcdef',
  WEB_REVALIDATE_URL: `${webUrl}/api/revalidate`,
});

const { connectDatabase } = await import('../src/config/db');
const { createApp } = await import('../src/app');
const { UserModel } = await import('../src/models');
const { hashPassword } = await import('../src/modules/auth/password');
const { seedCatalogue } = await import('./seed-lib');

await connectDatabase(process.env.MONGODB_URI!);
await seedCatalogue();
await UserModel.create({ name: 'E2E Admin', email: E2E_ADMIN.email, passwordHash: await hashPassword(E2E_ADMIN.password), role: 'admin', emailVerified: true });

const server = createApp().listen(port, () => console.log(`E2E API ready on http://localhost:${port}`));

const stop = async () => {
  server.close();
  await replSet.stop();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
