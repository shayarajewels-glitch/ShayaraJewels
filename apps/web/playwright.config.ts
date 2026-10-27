import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4100;
const WEB_PORT = 3100;

/**
 * End-to-end tests run against an isolated stack: the real Express API on an
 * in-memory MongoDB (apps/api/scripts/e2e-server.ts) and the Next.js app
 * pointed at it. No real database or payment provider is touched.
 * Note: the web build bakes in the e2e API URL; run `npm run build` again
 * before deploying.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'npx tsx scripts/e2e-server.ts',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { E2E_API_PORT: String(API_PORT), E2E_WEB_URL: `http://localhost:${WEB_PORT}` },
    },
    {
      // A production build: exercises the real build and does not clash with a running `next dev`.
      // Each run seeds a fresh database (new ids), so drop data cached by a previous run first.
      command: `node -e "require('fs').rmSync('.next/cache/fetch-cache',{recursive:true,force:true})" && npx next build && npx next start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 400_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_BASE_URL: `http://localhost:${API_PORT}/api/v1`,
        NEXT_PUBLIC_SITE_URL: `http://localhost:${WEB_PORT}`,
        REVALIDATE_SECRET: 'e2e-revalidate-secret-0123456789abcdef',
      },
    },
  ],
});
