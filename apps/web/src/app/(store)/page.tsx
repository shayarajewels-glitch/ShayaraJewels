import { jsonLd } from '@/lib/json-ld';
import { Gem, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { ProductRail } from '@/components/product/product-rail';
import { Button } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/config';

export const revalidate = 300;

/** Category tiles reuse the first image of a product in each category. */
const CATEGORY_IMAGES: Record<string, string> = {
  bracelets: '/images/products/brc-kavy-g-1.svg',
  rings: '/images/products/rng-noor-rg-1.svg',
  necklaces: '/images/products/nck-aria-g-1.svg',
  pendants: '/images/products/pnd-chan-g-1.svg',
  anklets: '/images/products/ank-payl-s-1.svg',
};

export default async function HomePage() {
  const [featured, newArrivals, bestsellers] = await Promise.all([
    serverApi.collection('featured', 4),
    serverApi.collection('new-arrivals', 4),
    serverApi.collection('bestsellers', 4),
  ]);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/brand/shayara-mark.png`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(orgJsonLd)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ivory-deep">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <div className="max-w-xl">
            <p className="eyebrow mb-5 text-rose-deep">New season · Gold, silver &amp; rose gold tones</p>
            <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Everyday elegance.
              <span className="block italic text-rose-deep">Your kind of shine.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-charcoal-soft">
              Light, wearable fashion jewellery for work, weekends and every celebration in between — designed to layer, stack and make your own.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/shop">Shop the collection</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/categories/necklaces">Explore necklaces</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-5 grid-rows-6 gap-3 md:h-[34rem]">
            <div className="relative col-span-3 row-span-6 min-h-80 overflow-hidden rounded-sm">
              <ProductImage src="/images/products/nck-aria-g-1.svg" alt="Aria layered necklace in gold tone" fill priority sizes="(min-width: 768px) 30vw, 60vw" />
            </div>
            <div className="relative col-span-2 row-span-3 overflow-hidden rounded-sm">
              <ProductImage src="/images/products/rng-noor-rg-2.svg" alt="Noor solitaire ring in rose gold tone, close up" fill sizes="20vw" />
            </div>
            <div className="relative col-span-2 row-span-3 overflow-hidden rounded-sm">
              <ProductImage src="/images/products/pnd-chan-g-1.svg" alt="Chandni crescent pendant in gold tone" fill sizes="20vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section aria-label="Why Shayara" className="border-y border-border bg-ivory">
        <ul className="container-page grid grid-cols-2 gap-6 py-8 text-sm md:grid-cols-4">
          {[
            { icon: Truck, title: 'Free shipping', text: 'On orders above ₹999' },
            { icon: RefreshCcw, title: '7-day returns', text: 'On eligible, unworn pieces' },
            { icon: ShieldCheck, title: 'Secure checkout', text: 'UPI, cards & netbanking via Razorpay' },
            { icon: Gem, title: 'Honest materials', text: 'Finish and base metal listed on every piece' },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-champagne" aria-hidden />
              <div>
                <p className="font-semibold text-charcoal">{title}</p>
                <p className="text-xs text-charcoal-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ProductRail eyebrow="Handpicked" title="Our favourites" href="/shop" products={featured.items} />

      {/* Categories */}
      <section className="container-page py-14" aria-labelledby="shop-by-category">
        <p className="eyebrow mb-2">Find your piece</p>
        <h2 id="shop-by-category" className="mb-8 text-3xl sm:text-4xl">
          Shop by category
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {CATEGORIES.map((c, i) => (
            <li key={c.slug} className={i === 0 ? 'col-span-2 md:col-span-1' : undefined}>
              <Link href={`/categories/${c.slug}`} className="group block">
                <div className={`relative overflow-hidden rounded-sm bg-ivory-deep ${i === 0 ? 'aspect-[16/9] md:aspect-[4/5]' : 'aspect-[4/5]'}`}>
                  <ProductImage src={CATEGORY_IMAGES[c.slug]!} alt="" fill sizes="(min-width: 768px) 18vw, 45vw" className="transition-transform duration-700 group-hover:scale-105" />
                </div>
                <p className="mt-3 font-display text-xl group-hover:text-rose-deep">{c.name}</p>
                <p className="text-xs text-charcoal-soft">{c.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ProductRail eyebrow="Just in" title="New arrivals" href="/shop?sort=new" products={newArrivals.items} />

      {/* Editorial banner */}
      <section className="container-page py-10">
        <div className="grid overflow-hidden rounded-sm bg-charcoal text-ivory md:grid-cols-2">
          <div className="relative min-h-72">
            <ProductImage src="/images/products/brc-kavy-g-2.svg" alt="Detail of the Kavya charm bracelet" fill sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
          <div className="flex flex-col justify-center p-10 md:p-14">
            <p className="eyebrow mb-4 text-champagne">The stacking edit</p>
            <h2 className="text-4xl text-ivory">Build a stack that&apos;s all you</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-ivory/80">
              Mix finishes, layer lengths and add a charm or two. Our pieces are designed to be worn together — start with one and keep going.
            </p>
            <div className="mt-8">
              <Button asChild variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-charcoal">
                <Link href="/categories/bracelets">Shop bracelets</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Shown only once there are real sales; the fallback would just repeat "Our favourites". */}
      {!bestsellers.fallback && <ProductRail eyebrow="Loved by customers" title="Bestsellers" href="/shop?sort=bestsellers" products={bestsellers.items} />}
    </>
  );
}
