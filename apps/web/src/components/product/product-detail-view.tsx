import { RotateCcw, Truck } from 'lucide-react';
import Link from 'next/link';
import { FINISH_LABELS, RETURN_WINDOW_DAYS, categoryByType, formatPaise, FREE_SHIPPING_THRESHOLD_PAISE, type ProductDetailDto } from '@shayara/shared';
import { Badge } from '@/components/ui/misc';
import { Accordion, AccordionItem } from '@/components/ui/overlays';
import { AdminProductBar } from './admin-product-bar';
import { Price, RatingStars } from './price';
import { ProductGallery } from './product-gallery';
import { PurchasePanel } from './purchase-panel';

/**
 * The single product presentation used by the storefront and by the admin
 * preview, so administrators see exactly what customers see.
 */
export function ProductDetailView({ product, preview = false }: { product: ProductDetailDto; preview?: boolean }) {
  const category = categoryByType(product.type);
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      <ProductGallery images={product.images} videos={product.videos} productName={product.name} />

      <div className="lg:sticky lg:top-28 lg:self-start">
        <AdminProductBar productId={product.id} />
        <p className="eyebrow mb-3">
          <Link href={`/categories/${category.slug}`} className="hover:text-rose-deep">
            {category.name}
          </Link>{' '}
          · {FINISH_LABELS[product.finish]}
        </p>
        <h1 className="text-4xl leading-tight sm:text-5xl">{product.name}</h1>
        <div className="mt-3">
          {product.reviewCount > 0 ? (
            <a href="#reviews" className="hover:underline">
              <RatingStars rating={product.averageRating} count={product.reviewCount} />
            </a>
          ) : (
            <span className="text-xs text-charcoal-soft">No reviews yet</span>
          )}
        </div>
        <Price pricePaise={product.pricePaise} compareAtPricePaise={product.compareAtPricePaise} size="lg" className="mt-5" />
        <p className="mt-1 text-xs text-charcoal-soft">Inclusive of all taxes</p>

        <div className="mt-4">
          {!product.inStock ? (
            <Badge variant="muted">Currently sold out</Badge>
          ) : product.stockLeft !== null ? (
            <Badge variant="rose">Only {product.stockLeft} left</Badge>
          ) : (
            <Badge variant="success">In stock</Badge>
          )}
        </div>

        <p className="mt-6 text-[0.95rem] leading-7 text-charcoal-soft">{product.description}</p>

        <div className="mt-8">
          <PurchasePanel product={product} preview={preview} />
        </div>

        <ul className="mt-8 space-y-3 rounded-sm bg-ivory-deep p-5 text-sm">
          <li className="flex gap-3">
            <Truck className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
            <span>
              Dispatched in 1–2 business days; delivery usually takes 3–7 business days across India. Free shipping above {formatPaise(FREE_SHIPPING_THRESHOLD_PAISE)}.
            </span>
          </li>
          <li className="flex gap-3">
            <RotateCcw className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
            <span>
              Return within {RETURN_WINDOW_DAYS} days of delivery if unworn and in original packaging.{' '}
              <Link href="/returns-policy" className="text-rose-deep underline underline-offset-4">
                Returns policy
              </Link>
            </span>
          </li>
        </ul>

        <Accordion type="multiple" defaultValue={['details']} className="mt-6">
          <AccordionItem value="details" title="Details & materials">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
              <dt className="text-charcoal">Finish</dt>
              <dd>{FINISH_LABELS[product.finish]}</dd>
              {product.baseMaterial && (
                <>
                  <dt className="text-charcoal">Base material</dt>
                  <dd>{product.baseMaterial}</dd>
                </>
              )}
              {product.sizeOptions.length > 0 && (
                <>
                  <dt className="text-charcoal">Sizes</dt>
                  <dd>{product.sizeOptions.join(', ')}</dd>
                </>
              )}
              <dt className="text-charcoal">SKU</dt>
              <dd>{product.sku}</dd>
            </dl>
            <p className="mt-3 text-xs">
              This is fashion jewellery. The {FINISH_LABELS[product.finish].toLowerCase()} is a plated or coated finish, not solid precious metal.
            </p>
          </AccordionItem>
          {product.careInstructions && (
            <AccordionItem value="care" title="Care instructions">
              {product.careInstructions}
            </AccordionItem>
          )}
          <AccordionItem value="shipping" title="Shipping & returns">
            Read our{' '}
            <Link href="/shipping-policy" className="text-rose-deep underline underline-offset-4">
              shipping policy
            </Link>{' '}
            and{' '}
            <Link href="/returns-policy" className="text-rose-deep underline underline-offset-4">
              returns, refunds &amp; cancellation policy
            </Link>
            .
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
