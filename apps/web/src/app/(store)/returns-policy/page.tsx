import type { Metadata } from 'next';
import Link from 'next/link';
import { RETURN_WINDOW_DAYS } from '@shayara/shared';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'Returns, refunds & cancellations',
  description: `Cancel before dispatch, return unworn pieces within ${RETURN_WINDOW_DAYS} days, and how Shayara refunds work.`,
  alternates: { canonical: '/returns-policy' },
};

export default function ReturnsPolicyPage() {
  return (
    <ContentPage title="Returns, refunds & cancellations" updated="27 October 2026">
      <h2>Cancellations</h2>
      <p>
        You can cancel an order from <Link href="/account/orders">My account → Orders</Link> while it is awaiting payment or confirmed and not yet being packed. Once an order
        is packed or shipped it can no longer be cancelled, but you may return it after delivery.
      </p>
      <h2>Returns</h2>
      <ul>
        <li>Request a return within {RETURN_WINDOW_DAYS} days of delivery from your order page.</li>
        <li>Items must be unworn, unused and in their original packaging with all tags.</li>
        <li>We review every request and confirm pickup or return instructions by email.</li>
      </ul>
      <h2>Damaged or incorrect items</h2>
      <p>If your piece arrives damaged or isn&apos;t what you ordered, request a return within {RETURN_WINDOW_DAYS} days and include a short description. We will make it right.</p>
      <h2>Refunds</h2>
      <ul>
        <li>Prepaid orders are refunded to the original payment method through our payment partner, Razorpay.</li>
        <li>Refunds are initiated after a cancellation is confirmed or a returned item passes inspection.</li>
        <li>Banks usually credit refunds within 5–7 business days after initiation.</li>
        <li>For Cash on Delivery orders we will contact you to arrange a bank transfer or UPI refund.</li>
      </ul>
      <p>
        Questions? <Link href="/contact">Contact us</Link> with your order number.
      </p>
    </ContentPage>
  );
}
