import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/tests/global-setup.ts'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each test file gets its own database. Files run one at a time: with
    // parallel workers on Windows the test runner intermittently died with a
    // native fail-fast (0xC0000409) when a worker was torn down mid-run. It did
    // not reproduce outside the runner (argon2 stress-tested across processes
    // and threads), and sequential runs were stable. Concurrency *within* the
    // app is still exercised by the race-condition tests.
    fileParallelism: false,
    pool: 'threads',
  },
});
