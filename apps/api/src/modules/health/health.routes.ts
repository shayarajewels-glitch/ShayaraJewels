import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

/** Liveness: the process is up. Reveals nothing about configuration. */
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Readiness: the database connection is usable. */
healthRouter.get('/ready', async (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  let dbOk = false;
  if (connected) {
    try {
      await mongoose.connection.db!.admin().ping();
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'unavailable', database: dbOk ? 'up' : 'down' });
});
