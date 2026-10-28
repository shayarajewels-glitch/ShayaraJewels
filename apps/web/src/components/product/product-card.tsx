import Link from 'next/link';
import { discountPercent, FINISH_LABELS, type ProductSummaryDto } from '@shayara/shared';
import { Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { Price, RatingStars } from './price';
import { ProductImage } from './product-image';
import { WishlistButton } from './wishlist-button';

export function ProductCard({ product, priority = false, className }: { product: ProductSummaryDto; priority?: boolean; className?: string }) {
  const off = discountPercent(product.pricePaise, product.compareAtPricePaise);
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ivory-deep ring-1 ring-border/60 transition-shadow duration-500 group-hover:shadow-[0_18px_40px_-18px_rgba(90,60,40,0.35)]">
        {product.image ? (
          <>
            <ProductImage
              src={product.image.url}
              alt={product.image.alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
              className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            {product.hoverImage && (
              <ProductImage
                src={product.hoverImage.url}
                alt=""
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-charcoal-soft">Image coming soon</div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {!product.inStock && <Badge variant="muted">Sold out</Badge>}
          {product.inStock && off !== null && <Badge className="bg-rose-deep text-ivory">{off}% off</Badge>}
          {product.inStock && product.stockLeft !== null && <Badge variant="rose">Only {product.stockLeft} left</Badge>}
        </div>
        <WishlistButton product={product} className="absolute right-2 top-2" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-3 rounded-full bg-rose-deep/90 py-2.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ivory opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block"
        >
          View piece
        </span>
      </div>
      <div className="mt-3.5 flex flex-1 flex-col gap-1 px-0.5">
        <p className="eyebrow text-[0.62rem]">{FINISH_LABELS[product.finish]}</p>
        <h3 className="font-display text-lg leading-snug">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 hover:text-rose-deep focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring">
            {product.name}
          </Link>
        </h3>
        <RatingStars rating={product.averageRating} count={product.reviewCount} />
        <Price pricePaise={product.pricePaise} compareAtPricePaise={product.compareAtPricePaise} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummaryDto[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} priority={i < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
