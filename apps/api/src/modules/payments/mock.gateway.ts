import { randomBytes } from 'node:crypto';
import { getConfig } from '../../config/env';
import type { PaymentGateway, ProviderOrder, ProviderPayment, ProviderRefund } from './gateway';
import { checkoutSignature } from './signatures';

const id = (prefix: string) => `${prefix}_${randomBytes(7).toString('hex')}`;

/**
 * In-memory stand-in for Razorpay used by automated tests only. Config
 * validation refuses PAYMENT_PROVIDER=mock unless NODE_ENV=test, and the
 * constructor double-checks, so it cannot be enabled in production.
 */
export class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const;
  readonly orders = new Map<string, ProviderOrder>();
  readonly payments = new Map<string, ProviderPayment>();
  readonly refunds = new Map<string, ProviderRefund>();
  /** When set, the next call throws (simulates provider outages). */
  failNext: string | null = null;

  constructor(
    readonly keyId: string,
    private readonly keySecret: string,
  ) {
    if (getConfig().env !== 'test') throw new Error('MockGateway is only available when NODE_ENV=test');
  }

  private maybeFail(op: string) {
    if (this.failNext === op) {
      this.failNext = null;
      throw new Error(`mock ${op} failure`);
    }
  }

  async createOrder(input: { amount: number; currency: 'INR'; receipt: string }): Promise<ProviderOrder> {
    this.maybeFail('createOrder');
    const order = { id: id('order'), amount: input.amount, currency: input.currency, receipt: input.receipt };
    this.orders.set(order.id, order);
    return order;
  }

  async fetchPayment(paymentId: string): Promise<ProviderPayment> {
    this.maybeFail('fetchPayment');
    const p = this.payments.get(paymentId);
    if (!p) throw new Error('mock payment not found');
    return { ...p };
  }

  async fetchOrderPayments(orderId: string): Promise<ProviderPayment[]> {
    this.maybeFail('fetchOrderPayments');
    return [...this.payments.values()].filter((p) => p.orderId === orderId).map((p) => ({ ...p }));
  }

  async capturePayment(paymentId: string, amount: number): Promise<ProviderPayment> {
    this.maybeFail('capturePayment');
    const p = this.payments.get(paymentId);
    if (!p || p.status !== 'authorized' || p.amount !== amount) throw new Error('mock capture rejected');
    p.status = 'captured';
    return { ...p };
  }

  async refundPayment(paymentId: string, input: { amount: number }): Promise<ProviderRefund> {
    this.maybeFail('refundPayment');
    const refund: ProviderRefund = { id: id('rfnd'), paymentId, amount: input.amount, status: 'pending' };
    this.refunds.set(refund.id, refund);
    return { ...refund };
  }

  /* ---------------------------- test helpers ---------------------------- */

  /** Simulates the customer paying in Razorpay Checkout. Returns what Checkout hands the browser. */
  simulatePayment(orderId: string, status: ProviderPayment['status'] = 'captured', amount?: number) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('unknown mock order');
    const payment: ProviderPayment = {
      id: id('pay'),
      orderId,
      amount: amount ?? order.amount,
      currency: order.currency,
      status,
      method: 'upi',
      errorDescription: status === 'failed' ? 'Payment declined by bank' : null,
    };
    this.payments.set(payment.id, payment);
    return {
      razorpay_order_id: orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: checkoutSignature(orderId, payment.id, this.keySecret),
    };
  }

  setPaymentStatus(paymentId: string, status: ProviderPayment['status']) {
    const p = this.payments.get(paymentId);
    if (p) p.status = status;
  }
}
