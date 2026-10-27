import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { releaseExpiredReservations } from '../../jobs';
import { OrderModel, PaymentModel, ProductModel, WebhookEventModel } from '../../models';
import { addAddress, adminClient, createProduct, getApp, registeredClient } from '../../tests/helpers';
import { getPaymentGateway } from './gateway';
import type { MockGateway } from './mock.gateway';
import { checkoutSignature, verifyCheckoutSignature, verifyWebhookSignature } from './signatures';

const WEBHOOK_SECRET = 'test_webhook_secret';
const gateway = async () => (await getPaymentGateway()) as MockGateway;

async function pendingOrder(stock = 10, quantity = 1) {
  const product = await createProduct({ stock });
  const { client } = await registeredClient();
  const addressId = await addAddress(client);
  await client.post('/cart/items', { productId: product.id, quantity });
  const res = await client.checkout({ addressId, paymentMethod: 'razorpay' });
  const orderNumber = res.body.order.orderNumber as string;
  const created = await client.post('/payments/razorpay/create-order', { orderNumber });
  return { client, product, orderNumber, checkout: created.body as { razorpayOrderId: string; amountPaise: number; keyId: string } };
}

function sendWebhook(body: object, { secret = WEBHOOK_SECRET, eventId = `evt_${Math.random().toString(36).slice(2)}` } = {}) {
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  return request(getApp())
    .post('/api/v1/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', signature)
    .set('X-Razorpay-Event-Id', eventId)
    .send(raw);
}

const paymentEvent = (event: string, entity: { id: string; order_id: string; amount: number; status: string }) => ({
  event,
  payload: { payment: { entity: { ...entity, currency: 'INR', method: 'upi' } } },
});

describe('signature helpers', () => {
  it('verifies Razorpay checkout signatures against the stored order id', () => {
    const sig = checkoutSignature('order_ABC123', 'pay_XYZ789', 'secret');
    expect(verifyCheckoutSignature({ storedOrderId: 'order_ABC123', paymentId: 'pay_XYZ789', signature: sig, keySecret: 'secret' })).toBe(true);
    expect(verifyCheckoutSignature({ storedOrderId: 'order_OTHER1', paymentId: 'pay_XYZ789', signature: sig, keySecret: 'secret' })).toBe(false);
    expect(verifyCheckoutSignature({ storedOrderId: 'order_ABC123', paymentId: 'pay_XYZ789', signature: sig, keySecret: 'wrong' })).toBe(false);
  });

  it('verifies webhook signatures over the exact raw body', () => {
    const raw = Buffer.from('{"a":1}');
    const sig = createHmac('sha256', 's').update(raw).digest('hex');
    expect(verifyWebhookSignature(raw, sig, 's')).toBe(true);
    expect(verifyWebhookSignature(Buffer.from('{"a": 1}'), sig, 's')).toBe(false);
    expect(verifyWebhookSignature(raw, undefined, 's')).toBe(false);
    expect(verifyWebhookSignature(raw, 'zz', 's')).toBe(false);
  });
});

describe('Razorpay checkout', () => {
  it('creates a provider order for the server-side amount and reuses it on retry', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    expect(checkout.amountPaise).toBe(99_900);
    expect(checkout.keyId).toBe('rzp_test_mockkey');
    expect(JSON.stringify(checkout)).not.toContain('test_key_secret');
    const again = await client.post('/payments/razorpay/create-order', { orderNumber });
    expect(again.body.razorpayOrderId).toBe(checkout.razorpayOrderId);
    expect(await PaymentModel.countDocuments()).toBe(1);
  });

  it('marks the order paid only after a verified signature and a captured payment', async () => {
    const { client, product, orderNumber, checkout } = await pendingOrder(10, 2);
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    const res = await client.post('/payments/razorpay/verify', { orderNumber, ...result });
    expect(res.status).toBe(200);
    expect(res.body.paid).toBe(true);
    expect(res.body.order.status).toBe('confirmed');
    expect(res.body.order.paymentStatus).toBe('paid');
    expect((await ProductModel.findById(product._id).lean())?.unitsSold).toBe(2);
    const payment = await PaymentModel.findOne().lean();
    expect(payment?.status).toBe('captured');
    expect(payment?.signatureVerifiedAt).toBeTruthy();
  });

  it('rejects a forged signature', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    const res = await client.post('/payments/razorpay/verify', { orderNumber, ...result, razorpay_signature: 'a'.repeat(64) });
    expect(res.status).toBe(400);
    expect((await OrderModel.findOne({ orderNumber }).lean())?.paymentStatus).toBe('pending');
  });

  it('does not mark paid when the callback succeeds but the payment is not captured yet (delayed)', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const mock = await gateway();
    const result = mock.simulatePayment(checkout.razorpayOrderId, 'created');
    const res = await client.post('/payments/razorpay/verify', { orderNumber, ...result });
    expect(res.body.paid).toBe(false);
    expect(res.body.order.status).toBe('pending_payment');

    // The webhook arrives later and completes the order.
    mock.setPaymentStatus(result.razorpay_payment_id, 'captured');
    const hook = await sendWebhook(
      paymentEvent('payment.captured', { id: result.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' }),
    );
    expect(hook.status).toBe(200);
    expect((await OrderModel.findOne({ orderNumber }).lean())?.paymentStatus).toBe('paid');
  });

  it('captures authorized payments before marking them paid', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'authorized');
    const res = await client.post('/payments/razorpay/verify', { orderNumber, ...result });
    expect(res.body.paid).toBe(true);
  });

  it('refuses to apply a payment with the wrong amount', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured', 100);
    const res = await client.post('/payments/razorpay/verify', { orderNumber, ...result });
    expect(res.body.paid).toBe(false);
    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.paymentStatus).toBe('pending');
    expect(order?.attention).toMatch(/mismatch/);
  });

  it('keeps the order payable after a failed attempt', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const mock = await gateway();
    const failed = mock.simulatePayment(checkout.razorpayOrderId, 'failed');
    await sendWebhook(paymentEvent('payment.failed', { id: failed.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'failed' }));
    let order = (await client.get(`/orders/${orderNumber}`)).body;
    expect(order.paymentStatus).toBe('failed');
    expect(order.canPay).toBe(true);

    const ok = mock.simulatePayment(checkout.razorpayOrderId, 'captured');
    await client.post('/payments/razorpay/verify', { orderNumber, ...ok });
    order = (await client.get(`/orders/${orderNumber}`)).body;
    expect(order.paymentStatus).toBe('paid');
  });

  it('prevents other users from paying or verifying an order', async () => {
    const { orderNumber, checkout } = await pendingOrder();
    const { client: other } = await registeredClient();
    expect((await other.post('/payments/razorpay/create-order', { orderNumber })).status).toBe(404);
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    expect((await other.post('/payments/razorpay/verify', { orderNumber, ...result })).status).toBe(404);
  });
});

describe('Razorpay webhooks', () => {
  it('rejects invalid signatures', async () => {
    const { checkout } = await pendingOrder();
    const res = await sendWebhook(paymentEvent('payment.captured', { id: 'pay_x1x1x1x1', order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' }), {
      secret: 'wrong',
    });
    expect(res.status).toBe(400);
    expect(await WebhookEventModel.countDocuments()).toBe(0);
  });

  it('processes duplicate events once and never fulfils twice', async () => {
    const { product, orderNumber, checkout } = await pendingOrder(10, 3);
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    const body = paymentEvent('payment.captured', { id: result.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' });
    const first = await sendWebhook(body, { eventId: 'evt_same' });
    const dup = await sendWebhook(body, { eventId: 'evt_same' });
    // A different event id for the same payment (e.g. order.paid) is also harmless.
    const other = await sendWebhook({ ...body, event: 'order.paid' }, { eventId: 'evt_other' });
    expect(first.body.status).toBe('processed');
    expect(dup.body.status).toBe('duplicate');
    expect(other.status).toBe(200);

    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.paymentStatus).toBe('paid');
    expect(order?.timeline.filter((t) => t.status === 'confirmed')).toHaveLength(1);
    expect((await ProductModel.findById(product._id).lean())?.unitsSold).toBe(3);
  });

  it('ignores a late payment.failed event after the order is paid (out of order)', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const result = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    await client.post('/payments/razorpay/verify', { orderNumber, ...result });
    await sendWebhook(paymentEvent('payment.failed', { id: 'pay_other1234', order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'failed' }));
    expect((await OrderModel.findOne({ orderNumber }).lean())?.paymentStatus).toBe('paid');
  });

  it('refunds a second successful payment for an already-paid order', async () => {
    const { client, orderNumber, checkout } = await pendingOrder();
    const mock = await gateway();
    const first = mock.simulatePayment(checkout.razorpayOrderId, 'captured');
    await client.post('/payments/razorpay/verify', { orderNumber, ...first });
    const second = mock.simulatePayment(checkout.razorpayOrderId, 'captured');
    await sendWebhook(paymentEvent('payment.captured', { id: second.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' }));
    expect([...mock.refunds.values()].some((r) => r.paymentId === second.razorpay_payment_id)).toBe(true);
    expect((await OrderModel.findOne({ orderNumber }).lean())?.attention).toMatch(/Duplicate payment/);
  });

  it('ignores unknown event types and unknown orders', async () => {
    expect((await sendWebhook({ event: 'subscription.charged', payload: {} })).body.status).toBe('ignored');
    const res = await sendWebhook(paymentEvent('payment.captured', { id: 'pay_unknown11', order_id: 'order_unknown1', amount: 100, status: 'captured' }));
    expect(res.status).toBe(200);
  });
});

describe('expiry and late payments', () => {
  it('reconciles with the provider before expiring a paid order', async () => {
    const { orderNumber, checkout } = await pendingOrder();
    (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    await OrderModel.updateOne({ orderNumber }, { paymentExpiresAt: new Date(Date.now() - 1000) });
    await releaseExpiredReservations();
    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.status).toBe('confirmed');
    expect(order?.paymentStatus).toBe('paid');
  });

  it('reinstates an expired order when payment arrives late and stock allows', async () => {
    const { product, orderNumber, checkout } = await pendingOrder(5, 2);
    await OrderModel.updateOne({ orderNumber }, { paymentExpiresAt: new Date(Date.now() - 1000) });
    await releaseExpiredReservations();
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(5);

    const late = (await gateway()).simulatePayment(checkout.razorpayOrderId, 'captured');
    await sendWebhook(paymentEvent('payment.captured', { id: late.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' }));
    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.status).toBe('confirmed');
    expect(order?.paymentStatus).toBe('paid');
    expect((await ProductModel.findById(product._id).lean())?.stock).toBe(3);
  });

  it('refunds a late payment when the stock has since sold out', async () => {
    const { product, orderNumber, checkout } = await pendingOrder(2, 2);
    await OrderModel.updateOne({ orderNumber }, { paymentExpiresAt: new Date(Date.now() - 1000) });
    await releaseExpiredReservations();
    await ProductModel.updateOne({ _id: product._id }, { stock: 0 });

    const mock = await gateway();
    const late = mock.simulatePayment(checkout.razorpayOrderId, 'captured');
    await sendWebhook(paymentEvent('payment.captured', { id: late.razorpay_payment_id, order_id: checkout.razorpayOrderId, amount: checkout.amountPaise, status: 'captured' }));
    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.status).toBe('cancelled');
    expect(order?.paymentStatus).toBe('refunded');
    expect([...mock.refunds.values()].some((r) => r.paymentId === late.razorpay_payment_id)).toBe(true);
  });
});

describe('refunds', () => {
  async function deliveredPaidOrder() {
    const ctx = await pendingOrder(10, 1);
    const result = (await gateway()).simulatePayment(ctx.checkout.razorpayOrderId, 'captured');
    await ctx.client.post('/payments/razorpay/verify', { orderNumber: ctx.orderNumber, ...result });
    await OrderModel.updateOne({ orderNumber: ctx.orderNumber }, { status: 'delivered', deliveredAt: new Date() });
    const order = await OrderModel.findOne({ orderNumber: ctx.orderNumber }).lean();
    return { ...ctx, orderId: order!._id.toString(), paymentId: result.razorpay_payment_id };
  }

  it('issues partial refunds and reconciles their status from webhooks', async () => {
    const { orderNumber, orderId, paymentId } = await deliveredPaidOrder();
    const admin = await adminClient();
    const res = await admin.post(`/admin/orders/${orderId}/refund`, { amountPaise: 40_000, reason: 'Goodwill refund' });
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('partially_refunded');
    expect(res.body.refundedPaise).toBe(0); // initiated, not yet processed

    const refundId = (await PaymentModel.findOne().lean())!.refunds[0]!.providerRefundId;
    await sendWebhook({ event: 'refund.processed', payload: { refund: { entity: { id: refundId, payment_id: paymentId, amount: 40_000, status: 'processed' } } } });
    let order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.refundedPaise).toBe(40_000);

    // An out-of-order "created" event must not regress a processed refund.
    await sendWebhook({ event: 'refund.created', payload: { refund: { entity: { id: refundId, payment_id: paymentId, amount: 40_000, status: 'pending' } } } });
    order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.refundedPaise).toBe(40_000);

    const tooMuch = await admin.post(`/admin/orders/${orderId}/refund`, { amountPaise: 60_000, reason: 'Too much' });
    expect(tooMuch.status).toBe(400);
    const rest = await admin.post(`/admin/orders/${orderId}/refund`, { reason: 'Remaining amount' });
    expect(rest.body.paymentStatus).toBe('refunded');
  });

  it('cancels and fully refunds a paid order that has not shipped', async () => {
    const ctx = await pendingOrder(5, 1);
    const result = (await gateway()).simulatePayment(ctx.checkout.razorpayOrderId, 'captured');
    await ctx.client.post('/payments/razorpay/verify', { orderNumber: ctx.orderNumber, ...result });
    const cancel = await ctx.client.post(`/orders/${ctx.orderNumber}/cancel`, { reason: 'Ordered by mistake' });
    expect(cancel.body.status).toBe('cancelled');
    expect(cancel.body.paymentStatus).toBe('refunded');
    expect((await ProductModel.findById(ctx.product._id).lean())?.stock).toBe(5);
  });

  it('marks a failed refund for admin attention', async () => {
    const { orderNumber, orderId, paymentId } = await deliveredPaidOrder();
    const admin = await adminClient();
    await admin.post(`/admin/orders/${orderId}/refund`, { reason: 'Customer complaint' });
    const refundId = (await PaymentModel.findOne().lean())!.refunds[0]!.providerRefundId;
    await sendWebhook({ event: 'refund.failed', payload: { refund: { entity: { id: refundId, payment_id: paymentId, amount: 99_900, status: 'failed' } } } });
    const order = await OrderModel.findOne({ orderNumber }).lean();
    expect(order?.paymentStatus).toBe('paid');
    expect(order?.attention).toMatch(/refund failed/i);
  });
});
