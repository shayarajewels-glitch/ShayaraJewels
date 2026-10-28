import { Clock, Mail, MapPin, MessageCircle, Package, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/page-heading';
import { Card } from '@/components/ui/misc';
import { STORE_ADDRESS, STORE_ADDRESS_TEXT, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Questions about an order, a product or a return? Get in touch with Shayara customer care.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="We're here to help" title="Contact us" crumbs={[{ href: '/', label: 'Home' }, { label: 'Contact' }]} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <Mail className="mb-4 size-6 text-champagne" aria-hidden />
          <h2 className="text-2xl">Email &amp; phone</h2>
          <p className="mt-2 text-sm text-charcoal-soft">Write or call us, and include your order number if you have one.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 block text-sm font-semibold text-rose-deep underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
          <a href={`tel:${SUPPORT_PHONE.e164}`} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-rose-deep underline underline-offset-4">
            <Phone className="size-3.5" aria-hidden />
            {SUPPORT_PHONE.display}
          </a>
          <a
            href={`https://wa.me/${SUPPORT_PHONE.e164.slice(1)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-rose-deep underline underline-offset-4"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Chat on WhatsApp
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
        <Card className="p-6">
          <MapPin className="mb-4 size-6 text-champagne" aria-hidden />
          <h2 className="text-2xl">Our address</h2>
          <address className="mt-2 text-sm not-italic leading-6 text-charcoal-soft">
            {STORE_ADDRESS.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block">
              {STORE_ADDRESS.locality}, {STORE_ADDRESS.region} {STORE_ADDRESS.postalCode}
            </span>
            <span className="block">{STORE_ADDRESS.country}</span>
          </address>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS_TEXT)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold text-rose-deep underline underline-offset-4"
          >
            View on Google Maps
          </a>
        </Card>
      </div>
    </div>
  );
}
