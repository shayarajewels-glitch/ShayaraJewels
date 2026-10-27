import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/tests/global-setup.ts'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each test file gets its own database; files run in parallel workers.
    fileParallelism: true,
    // Worker threads rather than child processes: on Windows the forks pool
    // intermittently crashed (0xC0000409) under parallel load, while threads
    // were stable across repeated runs.
    pool: 'threads',
  },
});
