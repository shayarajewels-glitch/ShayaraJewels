import Razorpay from 'razorpay';
import { AppError } from '../../utils/errors';
import type { PaymentGateway, ProviderOrder, ProviderPayment, ProviderPaymentStatus, ProviderRefund } from './gateway';

interface RazorpayPaymentEntity {
  id: string;
  order_id?: string | null;
  amount: number | string;
  currency: string;
  status: string;
  method?: string | null;
  error_description?: string | null;
}

interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number | string;
  status: string;
}

export function normalisePayment(p: RazorpayPaymentEntity): ProviderPayment {
  const known: ProviderPaymentStatus[] = ['created', 'authorized', 'captured', 'refunded', 'failed'];
  return {
    id: p.id,
    orderId: p.order_id ?? null,
    amount: Number(p.amount),
    currency: p.currency,
    status: (known as string[]).includes(p.status) ? (p.status as ProviderPaymentStatus) : 'created',
    method: p.method ?? null,
    errorDescription: p.error_description ?? null,
  };
}

export function normaliseRefund(r: RazorpayRefundEntity): ProviderRefund {
  return {
    id: r.id,
    paymentId: r.payment_id,
    amount: Number(r.amount),
    status: r.status === 'processed' ? 'processed' : r.status === 'failed' ? 'failed' : 'pending',
  };
}

/** Wraps SDK errors so provider details never leak to API clients. */
async function call<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const description =
      (err as { error?: { description?: string } })?.error?.description ?? (err instanceof Error ? err.message : 'unknown');
    const wrapped = new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not process the request. Please try again.');
    (wrapped as AppError & { cause?: unknown }).cause = `${operation}: ${description}`;
    throw wrapped;
  }
}

/** Razorpay Standard Checkout via the official Node.js SDK. */
export class RazorpayGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;
  private readonly client: Razorpay;

  constructor(readonly keyId: string, keySecret: string) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(input: { amount: number; currency: 'INR'; receipt: string; notes: Record<string, string> }): Promise<ProviderOrder> {
    const order = await call('orders.create', () =>
      this.client.orders.create({ amount: input.amount, currency: input.currency, receipt: input.receipt, notes: input.notes }),
    );
    return { id: order.id, amount: Number(order.amount), currency: order.currency, receipt: order.receipt ?? undefined };
  }

  async fetchPayment(paymentId: string): Promise<ProviderPayment> {
    const p = await call('payments.fetch', () => this.client.payments.fetch(paymentId));
    return normalisePayment(p as unknown as RazorpayPaymentEntity);
  }

  async fetchOrderPayments(orderId: string): Promise<ProviderPayment[]> {
    const res = await call('orders.fetchPayments', () => this.client.orders.fetchPayments(orderId));
    return (res.items as unknown as RazorpayPaymentEntity[]).map(normalisePayment);
  }

  async capturePayment(paymentId: string, amount: number, currency: 'INR'): Promise<ProviderPayment> {
    const p = await call('payments.capture', () => this.client.payments.capture(paymentId, amount, currency));
    return normalisePayment(p as unknown as RazorpayPaymentEntity);
  }

  async refundPayment(paymentId: string, input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<ProviderRefund> {
    const r = await call('payments.refund', () =>
      this.client.payments.refund(paymentId, { amount: input.amount, speed: 'normal', receipt: input.receipt, notes: input.notes }),
    );
    return normaliseRefund(r as unknown as RazorpayRefundEntity);
  }
}
