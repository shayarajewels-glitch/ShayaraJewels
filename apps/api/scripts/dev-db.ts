/**
 * Development-only local MongoDB: a single-node replica set (so transactions
 * work, like Atlas) whose data persists in apps/api/.data/mongo.
 *
 *   npm run db:dev
 *   MONGODB_URI=mongodb://127.0.0.1:27017/shayara?replicaSet=rs0
 *
 * Use MongoDB Atlas (or another managed replica set) for staging/production.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const port = Number(process.env.DEV_DB_PORT ?? 27017);
const dbPath = resolve(import.meta.dirname, '../.data/mongo');
mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port, dbPath }],
});

console.log(`\nLocal MongoDB replica set running (data: ${dbPath})`);
console.log(`MONGODB_URI=mongodb://127.0.0.1:${port}/shayara?replicaSet=rs0\n`);
console.log('Press Ctrl+C to stop. Data is kept between runs.');

const stop = async () => {
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
