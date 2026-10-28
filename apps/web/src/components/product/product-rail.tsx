import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ProductSummaryDto } from '@shayara/shared';
import { ProductCard } from './product-card';

export function ProductRail({ eyebrow, title, href, products }: { eyebrow?: string; title: string; href?: string; products: ProductSummaryDto[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page py-14" aria-labelledby={`rail-${title}`}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="eyebrow mb-2 flex items-center gap-2 text-rose-deep">
              <span className="text-champagne" aria-hidden>
                ✦
              </span>
              {eyebrow}
            </p>
          )}
          <h2 id={`rail-${title}`} className="text-3xl sm:text-5xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="eyebrow group/all inline-flex shrink-0 items-center gap-2 rounded-full border border-charcoal/20 px-4 py-2.5 transition-colors hover:border-rose-deep hover:bg-rose-deep hover:text-ivory"
          >
            View all
            <ArrowRight className="size-3.5 transition-transform group-hover/all:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <li key={p.id} className="w-[64vw] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
