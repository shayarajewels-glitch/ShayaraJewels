import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'scripts/create-admin.ts', 'scripts/seed.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false,
  // The shared workspace package is TypeScript source, so bundle it in.
  noExternal: ['@shayara/shared'],
});
