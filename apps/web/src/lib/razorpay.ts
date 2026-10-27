'use client';

import type { OrderDto, RazorpayCheckoutDto } from '@shayara/shared';
import { api } from './api-client';

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (resp: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PaymentOutcome =
  | { status: 'paid'; order: OrderDto }
  | { status: 'pending'; order: OrderDto; message: string }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string };

/**
 * Opens Razorpay Standard Checkout for an existing pending order. The amount
 * comes from the server; success is only reported after the API has verified
 * the signature and confirmed the captured payment with Razorpay.
 */
export async function payWithRazorpay(orderNumber: string): Promise<PaymentOutcome> {
  const checkout = await api<RazorpayCheckoutDto>('/payments/razorpay/create-order', { method: 'POST', body: { orderNumber } });
  await loadScript();
  if (!window.Razorpay) return { status: 'failed', message: 'The payment window is unavailable.' };

  return new Promise<PaymentOutcome>((resolve) => {
    let settled = false;
    const done = (outcome: PaymentOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };
    const rzp = new window.Razorpay!({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      theme: { color: '#94505b' },
      handler: async (resp: RazorpaySuccess) => {
        try {
          const result = await api<{ paid: boolean; message: string; order: OrderDto }>('/payments/razorpay/verify', {
            method: 'POST',
            body: { orderNumber, ...resp },
          });
          done(result.paid ? { status: 'paid', order: result.order } : { status: 'pending', order: result.order, message: result.message });
        } catch (err) {
          done({ status: 'failed', message: err instanceof Error ? err.message : 'Payment verification failed' });
        }
      },
      modal: { ondismiss: () => done({ status: 'dismissed' }), confirm_close: true },
    });
    rzp.on('payment.failed', (resp) => {
      // Razorpay keeps the modal open so the customer can retry; we only record the message.
      console.warn('Payment attempt failed', resp.error?.description);
    });
    rzp.open();
  });
}
