import { jsonLd } from '@/lib/json-ld';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SITE_URL } from '@/lib/config';

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}) })),
  };
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <ol className="flex flex-wrap items-center gap-1 text-xs text-charcoal-soft">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="hover:text-rose-deep">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeading({ eyebrow, title, description, crumbs }: { eyebrow?: string; title: string; description?: string; crumbs?: Crumb[] }) {
  return (
    <div className="bg-glow relative mb-10 overflow-hidden rounded-3xl px-6 py-9 ring-1 ring-border/60 sm:px-10 sm:py-12">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-champagne/30" />
      <div className="relative">
        {crumbs && <Breadcrumbs crumbs={crumbs} />}
        {eyebrow && (
          <p className="eyebrow mb-2 flex items-center gap-2 text-rose-deep">
            <span className="text-champagne" aria-hidden>
              ✦
            </span>
            {eyebrow}
          </p>
        )}
        <h1 className="text-4xl sm:text-6xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-soft">{description}</p>}
      </div>
    </div>
  );
}
