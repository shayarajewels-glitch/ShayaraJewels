import { Router, type Request, type Response } from 'express';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { isDuplicateKeyError } from '../../config/db';
import { WebhookEventModel, type WebhookEvent } from '../../models';
import { sha256 } from '../../utils/crypto';
import { normalisePayment, normaliseRefund } from './razorpay.gateway';
import { applyProviderPayment, applyProviderRefund } from './payment.service';
import { verifyWebhookSignature } from './signatures';

const STALE_PROCESSING_MS = 5 * 60 * 1000;

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: Parameters<typeof normalisePayment>[0] };
    refund?: { entity?: Parameters<typeof normaliseRefund>[0] };
  };
}

/** Returns 'processed' or 'ignored'. Throws to signal a retryable failure. */
export async function dispatchRazorpayEvent(body: RazorpayWebhookBody): Promise<'processed' | 'ignored'> {
  const type = body.event ?? '';
  const paymentEntity = body.payload?.payment?.entity;
  const refundEntity = body.payload?.refund?.entity;

  switch (type) {
    case 'payment.authorized':
    case 'payment.captured':
    case 'payment.failed':
    case 'order.paid':
      if (!paymentEntity) return 'ignored';
      await applyProviderPayment(normalisePayment(paymentEntity), 'webhook');
      return 'processed';
    case 'refund.created':
    case 'refund.processed':
    case 'refund.failed':
      if (!refundEntity) return 'ignored';
      await applyProviderRefund(normaliseRefund(refundEntity), 'webhook');
      return 'processed';
    default:
      return 'ignored';
  }
}

/**
 * Claims an event for processing. Returns the claimed record, or a response
 * status when the event is a duplicate (already done or in flight).
 */
async function claimEvent(eventId: string, eventType: string, payloadSha256: string): Promise<{ claimed: true } | { claimed: false; status: number; body: object }> {
  try {
    await WebhookEventModel.create({ provider: 'razorpay', eventId, eventType, payloadSha256, status: 'processing', receivedAt: new Date() });
    return { claimed: true };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
  const existing = await WebhookEventModel.findOne({ provider: 'razorpay', eventId }).lean<WebhookEvent>();
  if (!existing || existing.status === 'processed' || existing.status === 'ignored') {
    return { claimed: false, status: 200, body: { status: 'duplicate' } };
  }
  const retryable =
    existing.status === 'failed' || Date.now() - existing.receivedAt.getTime() > STALE_PROCESSING_MS;
  if (!retryable) return { claimed: false, status: 409, body: { status: 'in_progress' } };
  const reclaimed = await WebhookEventModel.findOneAndUpdate(
    { _id: existing._id, status: existing.status, attempts: existing.attempts },
    { status: 'processing', $inc: { attempts: 1 }, receivedAt: new Date(), error: null },
  );
  return reclaimed ? { claimed: true } : { claimed: false, status: 409, body: { status: 'in_progress' } };
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const log = getLogger().child({ module: 'webhooks', requestId: req.id });
  const secret = getConfig().payments.webhookSecret;
  if (!secret) {
    log.error('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
    res.status(503).json({ error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhooks are not configured' } });
    return;
  }

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verifyWebhookSignature(raw, req.get('x-razorpay-signature'), secret)) {
    log.warn('Rejected webhook with invalid signature');
    res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } });
    return;
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(raw.toString('utf8')) as RazorpayWebhookBody;
  } catch {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid payload' } });
    return;
  }

  const payloadSha256 = sha256(raw.toString('utf8'));
  const headerId = req.get('x-razorpay-event-id');
  const eventId = headerId && /^[\w-]{1,100}$/.test(headerId) ? headerId : `sha256:${payloadSha256}`;
  const eventType = (body.event ?? 'unknown').slice(0, 100);

  const claim = await claimEvent(eventId, eventType, payloadSha256);
  if (!claim.claimed) {
    res.status(claim.status).json(claim.body);
    return;
  }

  try {
    const outcome = await dispatchRazorpayEvent(body);
    await WebhookEventModel.updateOne({ provider: 'razorpay', eventId }, { status: outcome, processedAt: new Date() });
    log.info({ eventType, outcome }, 'Webhook handled');
    res.json({ status: outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await WebhookEventModel.updateOne({ provider: 'razorpay', eventId }, { status: 'failed', error: message.slice(0, 500) });
    log.error({ eventType, err: message }, 'Webhook processing failed; provider will retry');
    res.status(500).json({ error: { code: 'WEBHOOK_FAILED', message: 'Processing failed' } });
  }
}

export const razorpayWebhookRouter = Router();
razorpayWebhookRouter.post('/', handleRazorpayWebhook);
