import { getConfig } from '../../config/env';
import { serviceUnavailable } from '../../utils/errors';

export type ProviderPaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface ProviderOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
}

export interface ProviderPayment {
  id: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: ProviderPaymentStatus;
  method?: string | null;
  errorDescription?: string | null;
}

export interface ProviderRefund {
  id: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}

/** The subset of the payment provider used by Shayara. Amounts are integer paise. */
export interface PaymentGateway {
  readonly name: 'razorpay' | 'mock';
  readonly keyId: string;
  createOrder(input: { amount: number; currency: 'INR'; receipt: string; notes: Record<string, string> }): Promise<ProviderOrder>;
  fetchPayment(paymentId: string): Promise<ProviderPayment>;
  fetchOrderPayments(orderId: string): Promise<ProviderPayment[]>;
  capturePayment(paymentId: string, amount: number, currency: 'INR'): Promise<ProviderPayment>;
  refundPayment(paymentId: string, input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<ProviderRefund>;
}

let gateway: PaymentGateway | undefined;

export async function getPaymentGateway(): Promise<PaymentGateway> {
  if (gateway) return gateway;
  const config = getConfig();
  if (config.payments.provider === 'mock') {
    // Config validation guarantees this branch is reachable only when NODE_ENV=test.
    const { MockGateway } = await import('./mock.gateway');
    gateway = new MockGateway(config.payments.keyId ?? 'rzp_test_mock', config.payments.keySecret ?? 'mock_secret');
    return gateway;
  }
  if (!config.payments.keyId || !config.payments.keySecret) {
    throw serviceUnavailable(
      'Online payments are not configured yet. Please choose Cash on Delivery or try again later.',
      'PAYMENT_NOT_CONFIGURED',
    );
  }
  const { RazorpayGateway } = await import('./razorpay.gateway');
  gateway = new RazorpayGateway(config.payments.keyId, config.payments.keySecret);
  return gateway;
}

export function isOnlinePaymentConfigured(): boolean {
  const { payments } = getConfig();
  return payments.provider === 'mock' || Boolean(payments.keyId && payments.keySecret);
}

/** Test hook. */
export function setPaymentGateway(next: PaymentGateway | undefined): void {
  gateway = next;
}
