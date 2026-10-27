import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { ConfigError, getConfig } from './config/env';
import { getLogger } from './config/logger';
import { startJobs, stopJobs } from './jobs';
import { describeIntegrations } from './lib/integrations';

async function main(): Promise<void> {
  let config;
  try {
    config = getConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`\n[shayara-api] ${err.message}\n\nCopy apps/api/.env.example to apps/api/.env and fill in the required values.\n`);
      process.exit(1);
    }
    throw err;
  }
  const log = getLogger();

  await connectDatabase(config.mongodbUri);
  for (const line of describeIntegrations()) log.info(line);

  const app = createApp();
  const server = app.listen(config.port, () => {
    log.info({ port: config.port, env: config.env }, 'Shayara API listening');
  });
  if (config.jobsEnabled) startJobs();

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down');
    stopJobs();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[shayara-api] Failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
