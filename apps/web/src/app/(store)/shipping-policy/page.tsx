import type { Metadata } from 'next';
import { COD_FEE_PAISE, COD_MAX_TOTAL_PAISE, FREE_SHIPPING_THRESHOLD_PAISE, STANDARD_SHIPPING_PAISE, formatPaise } from '@shayara/shared';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = { title: 'Shipping policy', description: 'Shipping charges, timelines and delivery information for Shayara orders across India.', alternates: { canonical: '/shipping-policy' } };

export default function ShippingPolicyPage() {
  return (
    <ContentPage title="Shipping policy" updated="27 October 2026">
      <h2>Where we ship</h2>
      <p>We currently deliver to serviceable PIN codes across India. International shipping is not available yet.</p>
      <h2>Charges</h2>
      <ul>
        <li>Free standard shipping on orders of {formatPaise(FREE_SHIPPING_THRESHOLD_PAISE)} or more.</li>
        <li>A flat {formatPaise(STANDARD_SHIPPING_PAISE)} shipping charge applies to smaller orders.</li>
        <li>
          Cash on Delivery is available on orders up to {formatPaise(COD_MAX_TOTAL_PAISE)} with a {formatPaise(COD_FEE_PAISE)} handling fee.
        </li>
      </ul>
      <p>The exact charges for your order are shown at checkout before you pay.</p>
      <h2>Timelines</h2>
      <p>
        Orders are usually packed and dispatched within 1–2 business days of confirmation. Delivery typically takes 3–7 business days depending on your location.
        Remote areas, public holidays and courier disruptions can add time.
      </p>
      <h2>Tracking</h2>
      <p>Once your order ships, the courier name and tracking number appear on your order page under My account → Orders.</p>
      <h2>Prepaid orders</h2>
      <p>Prepaid orders are confirmed only after your payment is verified. If a payment is not completed within the payment window, the order is cancelled and any reserved items are released.</p>
      <h2>Questions</h2>
      <p>If your order is delayed, please contact us with your order number.</p>
    </ContentPage>
  );
}
