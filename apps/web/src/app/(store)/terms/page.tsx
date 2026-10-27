import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = { title: 'Terms & conditions', description: 'The terms that apply when you use the Shayara website and place an order.', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <ContentPage title="Terms & conditions" updated="27 October 2026">
      <p>By using this website or placing an order, you agree to these terms.</p>
      <h2>Our products</h2>
      <p>
        Shayara sells fashion (artificial) jewellery. Finishes described as gold, silver or rose gold tone are plated or coated finishes and are not solid precious metal.
        Product photos are representative; small variations in colour and finish can occur.
      </p>
      <h2>Prices and payment</h2>
      <ul>
        <li>Prices are in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</li>
        <li>The amount you pay is calculated by our server at checkout, including any shipping or Cash on Delivery fee.</li>
        <li>Online payments are processed by Razorpay. An order is confirmed only after payment is verified, or immediately for Cash on Delivery orders.</li>
        <li>If a pricing error occurs, we may cancel the affected order and refund any payment in full.</li>
      </ul>
      <h2>Orders and availability</h2>
      <p>Items in your bag are not reserved until you place an order. We may cancel orders that cannot be fulfilled, in which case any payment is refunded.</p>
      <h2>Shipping, returns and refunds</h2>
      <p>
        See our <Link href="/shipping-policy">shipping policy</Link> and <Link href="/returns-policy">returns, refunds &amp; cancellation policy</Link>.
      </p>
      <h2>Your account</h2>
      <p>Keep your password confidential. You are responsible for activity on your account. We may suspend accounts used for fraud or abuse.</p>
      <h2>Reviews</h2>
      <p>Reviews may only be posted by customers who received the product and are moderated before publication. We may decline reviews that are abusive, off-topic or misleading.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, our liability for any order is limited to the amount you paid for it.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
    </ContentPage>
  );
}
