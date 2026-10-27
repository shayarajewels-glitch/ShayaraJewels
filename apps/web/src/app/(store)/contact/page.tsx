import { Clock, Mail, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/page-heading';
import { Card } from '@/components/ui/misc';
import { SUPPORT_EMAIL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Questions about an order, a product or a return? Get in touch with Shayara customer care.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="We're here to help" title="Contact us" crumbs={[{ href: '/', label: 'Home' }, { label: 'Contact' }]} />
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <Mail className="mb-4 size-6 text-champagne" aria-hidden />
          <h2 className="text-2xl">Email</h2>
          <p className="mt-2 text-sm text-charcoal-soft">Write to us and include your order number if you have one.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-block text-sm font-semibold text-rose-deep underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
        </Card>
        <Card className="p-6">
          <Clock className="mb-4 size-6 text-champagne" aria-hidden />
          <h2 className="text-2xl">Response times</h2>
          <p className="mt-2 text-sm text-charcoal-soft">We reply within 1–2 business days, Monday to Saturday, 10am–6pm IST.</p>
        </Card>
        <Card className="p-6">
          <Package className="mb-4 size-6 text-champagne" aria-hidden />
          <h2 className="text-2xl">Orders &amp; returns</h2>
          <p className="mt-2 text-sm text-charcoal-soft">Track an order, cancel it or request a return from your account.</p>
          <Link href="/account/orders" className="mt-4 inline-block text-sm font-semibold text-rose-deep underline underline-offset-4">
            Go to my orders
          </Link>
        </Card>
      </div>
    </div>
  );
}
