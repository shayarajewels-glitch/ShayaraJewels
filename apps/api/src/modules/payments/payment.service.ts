import type { HydratedDocument, Types } from 'mongoose';
import type { RazorpayCheckoutDto, RazorpayVerifyInput } from '@shayara/shared';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { isDuplicateKeyError } from '../../config/db';
import { OrderModel, PaymentModel, type Order, type Payment, type PaymentEvent, type User } from '../../models';
import { AppError, badRequest, notFound } from '../../utils/errors';
import { reacquireOrderStock, setSalesCounted } from '../orders/inventory.service';
import { getPaymentGateway, type ProviderPayment, type ProviderRefund } from './gateway';
import { verifyCheckoutSignature } from './signatures';

type Source = PaymentEvent['source'];
type PaymentDoc = HydratedDocument<Payment>;

const log = () => getLogger().child({ module: 'payments' });

function checkoutSecret(): string {
  const { payments } = getConfig();
  if (payments.keySecret) return payments.keySecret;
  if (payments.provider === 'mock') return 'mock_secret';
  throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payments are not configured');
}

function event(type: string, source: Source, detail?: string): PaymentEvent {
  return { type, at: new Date(), source, detail: detail?.slice(0, 300) };
}

async function flagOrder(orderId: Types.ObjectId, message: string) {
  await OrderModel.updateOne({ _id: orderId }, { attention: message.slice(0, 500) });
  log().warn({ orderId: orderId.toString(), message }, 'Order flagged for admin attention');
}

/* ------------------------------------------------------------------------ */
/* Checkout                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Creates (or reuses) the Razorpay order for an internal pending order and
 * returns only what Checkout needs. The amount comes from the stored order.
 */
export async function createProviderOrder(user: User, orderNumber: string): Promise<RazorpayCheckoutDto> {
  const order = await OrderModel.findOne({ orderNumber, userId: user._id }).lean<Order>();
  if (!order) throw notFound('Order not found');
  if (order.paymentMethod !== 'razorpay') throw badRequest('This order is not paid online', 'NOT_PREPAID');
  if (order.status !== 'pending_payment' || !['pending', 'failed'].includes(order.paymentStatus)) {
    throw new AppError(409, 'ORDER_NOT_PAYABLE', 'This order can no longer be paid');
  }
  if (!order.paymentExpiresAt || order.paymentExpiresAt.getTime() <= Date.now()) {
    throw new AppError(409, 'PAYMENT_WINDOW_EXPIRED', 'The payment window for this order has closed. Please place the order again.');
  }

  const gateway = await getPaymentGateway();
  let payment = await PaymentModel.findOne({
    orderId: order._id,
    provider: gateway.name,
    amountPaise: order.totalPaise,
    status: { $in: ['created', 'failed'] },
  }).sort({ createdAt: -1 });

  if (!payment) {
    const providerOrder = await gateway.createOrder({
      amount: order.totalPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber, orderId: order._id.toString() },
    });
    if (providerOrder.amount !== order.totalPaise) {
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment provider returned an unexpected amount');
    }
    payment = await PaymentModel.create({
      orderId: order._id,
      userId: user._id,
      provider: gateway.name,
      providerOrderId: providerOrder.id,
      amountPaise: order.totalPaise,
      currency: 'INR',
      status: 'created',
      events: [event('order.created', 'checkout')],
    });
  }

  return {
    keyId: gateway.keyId,
    razorpayOrderId: payment.providerOrderId,
    amountPaise: payment.amountPaise,
    currency: 'INR',
    orderNumber: order.orderNumber,
    name: 'Shayara',
    description: `Order ${order.orderNumber}`,
    prefill: { name: user.name, email: user.email, contact: user.phone ?? undefined },
  };
}

/**
 * Handles the Checkout success callback. The signature is verified against
 * the Razorpay order id stored on our side; then the payment is fetched from
 * Razorpay and only a captured payment with the right amount, currency and
 * order marks the order paid. The callback alone never fulfils an order.
 */
export async function verifyCheckout(user: User, input: RazorpayVerifyInput) {
  const order = await OrderModel.findOne({ orderNumber: input.orderNumber, userId: user._id }).lean<Order>();
  if (!order) throw notFound('Order not found');
  const payment = await PaymentModel.findOne({ orderId: order._id, providerOrderId: input.razorpay_order_id });
  if (!payment) throw badRequest('Payment does not match this order', 'PAYMENT_MISMATCH');

  const valid = verifyCheckoutSignature({
    storedOrderId: payment.providerOrderId,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
    keySecret: checkoutSecret(),
  });
  if (!valid) {
    await PaymentModel.updateOne({ _id: payment._id }, { $push: { events: event('signature.invalid', 'checkout') } });
    log().warn({ orderNumber: order.orderNumber }, 'Invalid checkout signature');
    throw badRequest('Payment verification failed', 'INVALID_SIGNATURE');
  }
  await PaymentModel.updateOne(
    { _id: payment._id },
    { $set: { signatureVerifiedAt: new Date() }, $push: { events: event('signature.verified', 'checkout') } },
  );

  const gateway = await getPaymentGateway();
  const providerPayment = await gateway.fetchPayment(input.razorpay_payment_id);
  await applyProviderPayment(providerPayment, 'checkout');

  const fresh = await OrderModel.findById(order._id).lean<Order>();
  return { order: fresh!, paid: fresh!.paymentStatus === 'paid' };
}

/* ------------------------------------------------------------------------ */
/* Reconciliation (checkout callback, webhooks and the expiry job)           */
/* ------------------------------------------------------------------------ */

/**
 * Applies a trusted provider payment state (fetched from the API or received
 * in a signed webhook). Idempotent and safe for duplicated or out-of-order
 * events: state only moves forward, and a paid order is never un-paid here.
 */
export async function applyProviderPayment(pp: ProviderPayment, source: Source): Promise<void> {
  if (!pp.orderId) return;
  const payment = await PaymentModel.findOne({ providerOrderId: pp.orderId });
  if (!payment) {
    log().warn({ providerOrderId: pp.orderId, source }, 'Payment for unknown provider order ignored');
    return;
  }

  if (pp.amount !== payment.amountPaise || pp.currency !== 'INR') {
    await PaymentModel.updateOne(
      { _id: payment._id },
      { $push: { events: event('amount.mismatch', source, `${pp.id}: ${pp.amount} ${pp.currency}`) } },
    );
    await flagOrder(payment.orderId, `Payment ${pp.id} amount/currency mismatch (${pp.amount} ${pp.currency}); not applied.`);
    return;
  }

  switch (pp.status) {
    case 'failed':
      return recordFailedAttempt(payment, pp, source);
    case 'authorized':
      return captureAuthorized(payment, pp, source);
    case 'captured':
    case 'refunded':
      return recordCaptured(payment, pp, source);
    default:
      return;
  }
}

async function recordFailedAttempt(payment: PaymentDoc, pp: ProviderPayment, source: Source) {
  await PaymentModel.updateOne(
    { _id: payment._id, status: { $in: ['created', 'failed'] } },
    {
      $set: { status: 'failed', failureReason: pp.errorDescription ?? 'Payment failed' },
      $push: { events: event('payment.failed', source, pp.id) },
    },
  );
  // Customers may retry within the payment window, so the order stays payable.
  await OrderModel.updateOne(
    { _id: payment.orderId, status: 'pending_payment', paymentStatus: 'pending' },
    { paymentStatus: 'failed' },
  );
}

async function captureAuthorized(payment: PaymentDoc, pp: ProviderPayment, source: Source) {
  const order = await OrderModel.findById(payment.orderId).lean<Order>();
  if (!order) return;
  const payable = order.status === 'pending_payment' || (order.status === 'cancelled' && order.cancellation?.by === 'system');
  if (!payable || order.paymentStatus === 'paid') {
    // Not captured: Razorpay automatically releases uncaptured authorizations.
    await PaymentModel.updateOne({ _id: payment._id }, { $push: { events: event('payment.authorized.ignored', source, pp.id) } });
    return;
  }
  await PaymentModel.updateOne({ _id: payment._id }, { $push: { events: event('payment.authorized', source, pp.id) } });
  const gateway = await getPaymentGateway();
  const captured = await gateway.capturePayment(pp.id, payment.amountPaise, 'INR');
  if (captured.status === 'captured') await recordCaptured(payment, captured, source);
}

async function recordCaptured(payment: PaymentDoc, pp: ProviderPayment, source: Source) {
  // A second successful payment for an order that is already paid: refund it.
  if (payment.providerPaymentId && payment.providerPaymentId !== pp.id && payment.status !== 'failed' && payment.status !== 'created') {
    await refundDuplicatePayment(payment, pp, source);
    return;
  }
  try {
    await PaymentModel.updateOne(
      { _id: payment._id, status: { $in: ['created', 'failed', 'authorized'] } },
      {
        $set: { status: 'captured', providerPaymentId: pp.id, capturedAt: new Date(), method: pp.method ?? null, failureReason: null },
        $push: { events: event('payment.captured', source, pp.id) },
      },
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) return; // this provider payment is already recorded elsewhere
    throw err;
  }
  await markOrderPaid(payment.orderId, source);
}

async function refundDuplicatePayment(payment: PaymentDoc, pp: ProviderPayment, source: Source) {
  const alreadyNoted = payment.events.some((e) => e.type === 'duplicate.refunded' && e.detail === pp.id);
  if (alreadyNoted) return;
  const gateway = await getPaymentGateway();
  try {
    const refund = await gateway.refundPayment(pp.id, {
      amount: pp.amount,
      receipt: `dup-${pp.id}`.slice(0, 40),
      notes: { reason: 'Duplicate payment for an already-paid order' },
    });
    await PaymentModel.updateOne({ _id: payment._id }, { $push: { events: event('duplicate.refunded', source, pp.id) } });
    await flagOrder(payment.orderId, `Duplicate payment ${pp.id} was refunded automatically (refund ${refund.id}).`);
  } catch {
    await flagOrder(payment.orderId, `Duplicate payment ${pp.id} received — automatic refund failed, refund it from the Razorpay dashboard.`);
  }
}

/** Marks a pending order paid exactly once; handles payments that arrive after cancellation/expiry. */
export async function markOrderPaid(orderId: Types.ObjectId, source: Source): Promise<void> {
  const now = new Date();
  const updated = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: 'pending_payment', paymentStatus: { $in: ['pending', 'failed'] } },
    {
      $set: { paymentStatus: 'paid', status: 'confirmed', paidAt: now, paymentExpiresAt: null },
      $push: { timeline: { status: 'confirmed', at: now, by: 'system', note: 'Payment received' } },
    },
    { returnDocument: 'after' },
  );
  if (updated) {
    await setSalesCounted(updated._id, true);
    log().info({ orderNumber: updated.orderNumber, source }, 'Order paid');
    return;
  }

  const order = await OrderModel.findById(orderId).lean<Order>();
  if (!order || order.paymentStatus === 'paid' || order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded') {
    return; // already handled — duplicate or out-of-order event
  }
  if (order.status !== 'cancelled') return;
  await handleLatePayment(order, source);
}

/**
 * A captured payment for a cancelled order. If the system expired it, try to
 * reinstate the order (stock permitting); otherwise refund automatically.
 */
async function handleLatePayment(order: Order, source: Source): Promise<void> {
  const now = new Date();
  if (order.cancellation?.by === 'system' && (await reacquireOrderStock(order._id))) {
    const reinstated = await OrderModel.findOneAndUpdate(
      { _id: order._id, status: 'cancelled', paymentStatus: { $in: ['pending', 'failed', 'expired'] } },
      {
        $set: { status: 'confirmed', paymentStatus: 'paid', paidAt: now, cancellation: null },
        $push: { timeline: { status: 'confirmed', at: now, by: 'system', note: 'Payment received after the window closed; order reinstated' } },
      },
      { returnDocument: 'after' },
    );
    if (reinstated) {
      await setSalesCounted(order._id, true);
      return;
    }
  }

  const marked = await OrderModel.findOneAndUpdate(
    { _id: order._id, status: 'cancelled', paymentStatus: { $in: ['pending', 'failed', 'expired'] } },
    { $set: { paymentStatus: 'paid', paidAt: now } },
    { returnDocument: 'after' },
  );
  if (!marked) return;
  try {
    await refundOrder({ orderId: order._id, reason: 'Payment received after the order was cancelled', source });
  } catch (err) {
    await flagOrder(order._id, `Payment received after cancellation; automatic refund failed (${err instanceof Error ? err.message : 'error'}). Refund manually.`);
  }
}

/* ------------------------------------------------------------------------ */
/* Refunds                                                                   */
/* ------------------------------------------------------------------------ */

export async function refundOrder(params: {
  orderId: Types.ObjectId;
  amountPaise?: number;
  reason: string;
  source: Source;
  adminId?: Types.ObjectId;
}): Promise<ProviderRefund> {
  const order = await OrderModel.findById(params.orderId).lean<Order>();
  if (!order) throw notFound('Order not found');
  if (order.paymentMethod !== 'razorpay') {
    throw badRequest('Cash on Delivery orders are refunded outside the payment gateway', 'COD_REFUND_MANUAL');
  }
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
    throw new AppError(409, 'NOT_REFUNDABLE', 'Only paid orders can be refunded');
  }
  const payment = await PaymentModel.findOne({
    orderId: order._id,
    providerPaymentId: { $ne: null },
    status: { $in: ['captured', 'partially_refunded'] },
  });
  if (!payment?.providerPaymentId) throw new AppError(409, 'NOT_REFUNDABLE', 'No captured payment found for this order');

  const committed = payment.refunds.filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amountPaise, 0);
  const refundable = payment.amountPaise - committed;
  const amount = params.amountPaise ?? refundable;
  if (amount <= 0 || amount > refundable) {
    throw badRequest(`Refund amount must be between ₹1 and ₹${(refundable / 100).toFixed(2)}`, 'INVALID_REFUND_AMOUNT');
  }

  const gateway = await getPaymentGateway();
  const refund = await gateway.refundPayment(payment.providerPaymentId, {
    amount,
    receipt: `${order.orderNumber}-R${payment.refunds.length + 1}`.slice(0, 40),
    notes: { orderNumber: order.orderNumber, reason: params.reason.slice(0, 200) },
  });
  await PaymentModel.updateOne(
    { _id: payment._id, 'refunds.providerRefundId': { $ne: refund.id } },
    {
      $push: {
        refunds: {
          providerRefundId: refund.id,
          amountPaise: refund.amount,
          status: refund.status,
          reason: params.reason,
          requestedBy: params.adminId ?? null,
          createdAt: new Date(),
          processedAt: refund.status === 'processed' ? new Date() : null,
        },
        events: event('refund.created', params.source, `${refund.id} ${refund.amount}`),
      },
    },
  );
  await recomputeRefundState(payment._id);
  return refund;
}

/** Applies a refund status from a signed webhook; creates the record if the webhook won the race. */
export async function applyProviderRefund(pr: ProviderRefund, source: Source): Promise<void> {
  const payment = await PaymentModel.findOne({ providerPaymentId: pr.paymentId });
  if (!payment) return;
  const existing = payment.refunds.find((r) => r.providerRefundId === pr.id);
  if (!existing) {
    await PaymentModel.updateOne(
      { _id: payment._id, 'refunds.providerRefundId': { $ne: pr.id } },
      {
        $push: {
          refunds: { providerRefundId: pr.id, amountPaise: pr.amount, status: pr.status, createdAt: new Date(), processedAt: pr.status === 'processed' ? new Date() : null },
          events: event(`refund.${pr.status}`, source, pr.id),
        },
      },
    );
  } else if (existing.status !== 'processed' && existing.status !== pr.status) {
    // processed is terminal; never regress it on an out-of-order event
    await PaymentModel.updateOne(
      { _id: payment._id, 'refunds.providerRefundId': pr.id },
      {
        $set: { 'refunds.$.status': pr.status, 'refunds.$.processedAt': pr.status === 'processed' ? new Date() : null },
        $push: { events: event(`refund.${pr.status}`, source, pr.id) },
      },
    );
  }
  await recomputeRefundState(payment._id);
}

/** Derives payment + order refund fields from the refund records. */
async function recomputeRefundState(paymentId: Types.ObjectId): Promise<void> {
  const payment = await PaymentModel.findById(paymentId).lean<Payment>();
  if (!payment) return;
  const active = payment.refunds.filter((r) => r.status !== 'failed');
  const committed = active.reduce((s, r) => s + r.amountPaise, 0);
  const processed = active.filter((r) => r.status === 'processed').reduce((s, r) => s + r.amountPaise, 0);
  const paymentStatus = committed === 0 ? 'captured' : committed >= payment.amountPaise ? 'refunded' : 'partially_refunded';
  await PaymentModel.updateOne({ _id: payment._id, status: { $ne: 'failed' } }, { status: paymentStatus });

  const orderPaymentStatus = committed === 0 ? 'paid' : committed >= payment.amountPaise ? 'refunded' : 'partially_refunded';
  await OrderModel.updateOne(
    { _id: payment.orderId, paymentStatus: { $in: ['paid', 'partially_refunded', 'refunded'] } },
    { paymentStatus: orderPaymentStatus, refundedPaise: processed },
  );
  if (payment.refunds.some((r) => r.status === 'failed')) {
    await flagOrder(payment.orderId, 'A refund failed at the payment provider. Retry the refund from the admin panel.');
  }
}

/** Expiry-job helper: asks the provider whether a pending order was actually paid. */
export async function reconcileOrderWithProvider(orderId: Types.ObjectId): Promise<void> {
  const payments = await PaymentModel.find({ orderId, status: { $in: ['created', 'failed', 'authorized'] } }).lean<Payment[]>();
  if (payments.length === 0) return;
  const gateway = await getPaymentGateway();
  for (const p of payments) {
    const providerPayments = await gateway.fetchOrderPayments(p.providerOrderId);
    const best =
      providerPayments.find((x) => x.status === 'captured') ??
      providerPayments.find((x) => x.status === 'authorized') ??
      providerPayments.find((x) => x.status === 'failed');
    if (best) await applyProviderPayment(best, 'reconcile');
  }
}
