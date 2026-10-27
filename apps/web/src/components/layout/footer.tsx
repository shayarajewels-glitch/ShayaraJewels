import Link from 'next/link';
import { CATEGORIES } from '@shayara/shared';
import { Logo } from '@/components/brand/logo';
import { SITE_TAGLINE, SUPPORT_EMAIL } from '@/lib/config';

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
    <footer className="mt-24 bg-charcoal text-ivory/80">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs font-display text-xl italic text-ivory/90">{SITE_TAGLINE}</p>
          <p className="mt-4 max-w-xs text-sm leading-6">
            Artificial and fashion jewellery, designed for everyday wear. Gold, silver and rose gold tones — never presented as precious metal.
          </p>
        </div>
        <FooterColumn title="Shop" links={[{ href: '/shop', label: 'All jewellery' }, ...CATEGORIES.map((c) => ({ href: `/categories/${c.slug}`, label: c.name }))]} />
        <FooterColumn title="Help" links={help} />
        <FooterColumn title="Shayara" links={company} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Shayara. All rights reserved.</p>
          <p>
            Questions? <a className="underline underline-offset-4 hover:text-ivory" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
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
            <Link href={l.href} className="hover:text-ivory">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
