import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts', 'scripts/create-admin': 'scripts/create-admin.ts', 'scripts/seed': 'scripts/seed.ts' },
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
