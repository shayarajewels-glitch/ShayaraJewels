import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES } from '@shayara/shared';
import { Logo } from '@/components/brand/logo';
import { DEMO_NOTICE, SITE_TAGLINE, SOCIAL_LINKS, STORE_ADDRESS_TEXT, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/config';

/** Brand marks drawn inline (the icon set has no brand logos). */
const SOCIALS = [
  {
    label: 'Instagram',
    href: SOCIAL_LINKS.instagram,
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z',
  },
  {
    label: 'Facebook',
    href: SOCIAL_LINKS.facebook,
    path: 'M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07Z',
  },
];

const help = [
  { href: '/shipping-policy', label: 'Shipping' },
  { href: '/returns-policy', label: 'Returns, refunds & cancellations' },
  { href: '/account/orders', label: 'Track an order' },
  { href: '/contact', label: 'Contact us' },
];
const company = [
  { href: '/about', label: 'About Shayara' },
  { href: '/privacy-policy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms & conditions' },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-rose-deep/40 bg-black text-charcoal-soft">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full border border-champagne/15" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-10 size-72 rounded-full border border-rose/20" />
      <div className="container-page relative border-b border-white/10 py-14 text-center">
        <p className="ornament eyebrow mx-auto mb-5 max-w-xs text-champagne">Shayara</p>
        <p className="mx-auto max-w-2xl font-display text-3xl leading-tight text-charcoal sm:text-5xl">
          Jewellery for the everyday, <span className="italic text-champagne">made to be noticed.</span>
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-champagne/50 px-7 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-charcoal transition-colors hover:bg-champagne hover:text-ivory"
        >
          Shop the collection <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="container-page relative grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs font-display text-xl italic text-charcoal/90">{SITE_TAGLINE}</p>
          <p className="mt-4 max-w-xs text-sm leading-6">
            Artificial and fashion jewellery, designed for everyday wear. Gold, silver and rose gold tones — never presented as precious metal.
          </p>
          <ul className="mt-6 flex gap-3" aria-label="Follow Shayara">
            {SOCIALS.map(({ label, href, path }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Shayara on ${label}`}
                  className="flex size-10 items-center justify-center rounded-full border border-charcoal/20 text-charcoal/80 transition-colors hover:border-champagne hover:bg-champagne hover:text-ivory"
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
                    <path d={path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <FooterColumn title="Shop" links={[{ href: '/shop', label: 'All jewellery' }, ...CATEGORIES.map((c) => ({ href: `/categories/${c.slug}`, label: c.name }))]} />
        <FooterColumn title="Help" links={help} />
        <FooterColumn title="Shayara" links={company} />
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-charcoal/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} Shayara. All rights reserved.</p>
            <address className="not-italic">{STORE_ADDRESS_TEXT}</address>
            {DEMO_NOTICE && <p className="text-champagne/80">{DEMO_NOTICE}</p>}
          </div>
          <p>
            Questions? <a className="underline underline-offset-4 hover:text-charcoal" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            {' · '}
            <a className="underline underline-offset-4 hover:text-charcoal" href={`tel:${SUPPORT_PHONE.e164}`}>
              {SUPPORT_PHONE.display}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-4 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-champagne">{title}</h2>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-charcoal">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
