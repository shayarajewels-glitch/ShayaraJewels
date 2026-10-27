import { getLogger } from '../config/logger';
import { OrderModel } from '../models';
import { expireOrder } from '../modules/orders/orders.service';
import { isOnlinePaymentConfigured } from '../modules/payments/gateway';
import { reconcileOrderWithProvider } from '../modules/payments/payment.service';
import { cleanupOrphanMedia } from '../modules/uploads/media.service';

/** After this long past expiry, an order is expired even if the provider cannot be reached. */
const PROVIDER_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Releases stock held by unpaid orders whose payment window has passed. Before
 * expiring, asks the provider whether the order was in fact paid (delayed
 * webhooks), so a paid order is not cancelled by mistake.
 */
export async function releaseExpiredReservations(now = new Date()): Promise<number> {
  const log = getLogger().child({ job: 'reservations' });
  const due = await OrderModel.find({ status: 'pending_payment', paymentExpiresAt: { $lte: now } })
    .select('_id orderNumber paymentExpiresAt')
    .limit(100)
    .lean();
  let expired = 0;
  for (const order of due) {
    if (isOnlinePaymentConfigured()) {
      try {
        await reconcileOrderWithProvider(order._id);
      } catch (err) {
        const overdue = now.getTime() - (order.paymentExpiresAt?.getTime() ?? 0) > PROVIDER_GRACE_MS;
        log.warn({ orderNumber: order.orderNumber, overdue, err: err instanceof Error ? err.message : err }, 'Could not reconcile with provider');
        if (!overdue) continue;
      }
    }
    if (await expireOrder(order._id)) {
      expired++;
      log.info({ orderNumber: order.orderNumber }, 'Unpaid order expired; stock released');
    }
  }
  return expired;
}

const timers: NodeJS.Timeout[] = [];

function every(ms: number, name: string, task: () => Promise<unknown>) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      getLogger().error({ job: name, err: err instanceof Error ? err.message : err }, 'Job failed');
    } finally {
      running = false;
    }
  };
  timers.push(setInterval(run, ms));
  setTimeout(run, 5_000).unref();
}

/**
 * In-process jobs. With several API instances they still behave correctly
 * (each step is an atomic, idempotent transition), just redundantly.
 */
export function startJobs(): void {
  every(60_000, 'release-expired-reservations', () => releaseExpiredReservations());
  every(60 * 60_000, 'cleanup-orphan-media', () => cleanupOrphanMedia());
}

export function stopJobs(): void {
  for (const t of timers.splice(0)) clearInterval(t);
}
