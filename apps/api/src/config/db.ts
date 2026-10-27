import mongoose, { type ClientSession } from 'mongoose';
import { getLogger } from './logger';

// Unknown filter keys are dropped. Operator injection is prevented upstream:
// every request input is parsed with a Zod schema before it reaches a query.
mongoose.set('strictQuery', true);

let transactionsSupported = false;

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: true,
  });
  transactionsSupported = await detectTransactionSupport();
  getLogger().info({ transactionsSupported }, 'MongoDB connected');
  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** Multi-document transactions need a replica set or sharded cluster (Atlas always is; a bare local mongod is not). */
async function detectTransactionSupport(): Promise<boolean> {
  try {
    const hello = (await mongoose.connection.db!.admin().command({ hello: 1 })) as {
      setName?: string;
      msg?: string;
    };
    return Boolean(hello.setName) || hello.msg === 'isdbgrid';
  } catch {
    return false;
  }
}

export function supportsTransactions(): boolean {
  return transactionsSupported;
}

/** Test hook to exercise the non-transactional fallback paths. */
export function setTransactionSupport(value: boolean): void {
  transactionsSupported = value;
}

/**
 * Runs `work` inside a transaction when the deployment supports it. Without
 * transaction support `work` receives no session and must use atomic,
 * single-document updates with explicit compensation.
 */
export async function withOptionalTransaction<T>(work: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  if (!transactionsSupported) return work(undefined);
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function isDuplicateKeyError(err: unknown): err is { code: 11000; keyPattern?: Record<string, number> } {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
