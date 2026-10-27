import Link from 'next/link';
import type { ProductSummaryDto } from '@shayara/shared';
import { ProductCard } from './product-card';

export function ProductRail({ eyebrow, title, href, products }: { eyebrow?: string; title: string; href?: string; products: ProductSummaryDto[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page py-14" aria-labelledby={`rail-${title}`}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 id={`rail-${title}`} className="text-3xl sm:text-4xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link href={href} className="eyebrow shrink-0 border-b border-champagne pb-1 hover:text-rose-deep">
            View all
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
