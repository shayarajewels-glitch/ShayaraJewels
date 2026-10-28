import { jsonLd } from '@/lib/json-ld';
import { ArrowRight, Droplets, Gem, Gift, Package, RefreshCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES } from '@shayara/shared';
import { Price } from '@/components/product/price';
import { ProductImage } from '@/components/product/product-image';
import { ProductRail } from '@/components/product/product-rail';
import { Button } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_LINKS, STORE_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/config';

export const revalidate = 300;

/** Category tiles reuse the first image of a product in each category, on a tint of their own. */
const CATEGORY_TILES: Record<string, { image: string; tint: string }> = {
  bracelets: { image: '/images/products/brc-kavy-g-1.jpg', tint: 'from-champagne-soft to-ivory-deep' },
  rings: { image: '/images/products/rng-noor-rg-1.jpg', tint: 'from-rose-soft to-ivory-deep' },
  necklaces: { image: '/images/products/nck-aria-g-2.jpg', tint: 'from-sand to-ivory-deep' },
  pendants: { image: '/images/products/pnd-chan-g-1.jpg', tint: 'from-champagne-soft to-rose-soft' },
  anklets: { image: '/images/products/ank-payl-s-1.jpg', tint: 'from-sand to-ivory-deep' },
};

const FINISH_TILES = [
  { finish: 'gold', name: 'Gold tone', note: 'Warm, classic, festive', image: '/images/products/rng-mira-g-1.jpg', swatch: 'from-[#f7e9c4] via-[#e3c37f] to-[#c79a45]' },
  { finish: 'silver', name: 'Silver tone', note: 'Cool, crisp, everyday', image: '/images/products/brc-lumi-s-1.jpg', swatch: 'from-[#f6f6f8] via-[#d9dade] to-[#a9acb3]' },
  { finish: 'rose-gold', name: 'Rose gold tone', note: 'Soft, romantic, modern', image: '/images/products/rng-noor-rg-1.jpg', swatch: 'from-[#f8e3dd] via-[#e3ada1] to-[#bf7d70]' },
];

const BUDGETS = [
  { label: 'Under ₹599', note: 'Little treats', href: '/shop?maxPrice=599' },
  { label: 'Under ₹999', note: 'Thoughtful gifts', href: '/shop?maxPrice=999' },
  { label: '₹1,000 & above', note: 'Statement pieces', href: '/shop?minPrice=1000' },
];

const CARE_TIPS = [
  { icon: Droplets, title: 'Last on, first off', text: 'Put jewellery on after perfume, lotion and hairspray, and take it off before washing, swimming or workouts.' },
  { icon: Package, title: 'Store it apart', text: 'Keep each piece in its pouch or a lined box so chains don’t tangle and finishes don’t scratch.' },
  { icon: Sparkles, title: 'Wipe, don’t scrub', text: 'A soft dry cloth after wearing keeps the shine. Skip polishes and chemical cleaners on plated finishes.' },
];

export default async function HomePage() {
  const [featured, newArrivals, bestsellers] = await Promise.all([
    serverApi.collection('featured', 4),
    serverApi.collection('new-arrivals', 4),
    serverApi.collection('bestsellers', 4),
  ]);
  const spotlight = featured.items[0];

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/brand/shayara-mark.png`,
    sameAs: Object.values(SOCIAL_LINKS),
    email: SUPPORT_EMAIL,
    telephone: SUPPORT_PHONE.e164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE_ADDRESS.lines.join(', '),
      addressLocality: STORE_ADDRESS.locality,
      addressRegion: STORE_ADDRESS.region,
      postalCode: STORE_ADDRESS.postalCode,
      addressCountry: 'IN',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(orgJsonLd)} />

      {/* Hero */}
      <section className="bg-glow relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full border border-champagne/30" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/3 size-[22rem] rounded-full border border-rose/20" />
        <div className="container-page relative grid items-center gap-12 py-14 md:grid-cols-[1.05fr_1fr] md:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-champagne/50 bg-card/70 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-rose-deep backdrop-blur">
              <Sparkles className="size-3.5 text-champagne" aria-hidden />
              New season edit
            </p>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl lg:text-[5.25rem]">
              Everyday elegance.
              <span className="text-gilded block italic">Your kind of shine.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-charcoal-soft">
              Light, wearable fashion jewellery in gold, silver and rose gold tones — made to layer, stack and make your own, from desk days to wedding nights.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/shop">
                  Shop the collection <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-card/60 px-8 backdrop-blur">
                <Link href="/categories/necklaces">Explore necklaces</Link>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-charcoal-soft">
              {['Free shipping over ₹999', '7-day easy returns', 'Cash on delivery'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-champagne" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="arch relative mx-auto aspect-[4/5] w-[82%] overflow-hidden bg-card shadow-[0_40px_80px_-40px_rgba(90,60,40,0.45)] ring-8 ring-card/70">
              <ProductImage src="/images/products/nck-aria-g-1.jpg" alt="Aria layered necklace in gold tone" fill priority sizes="(min-width: 768px) 38vw, 80vw" />
            </div>
            <div className="arch absolute -right-1 top-6 hidden aspect-[3/4] w-[30%] overflow-hidden bg-card shadow-xl ring-4 ring-card sm:block">
              <ProductImage src="/images/products/rng-noor-rg-2.jpg" alt="Noor solitaire ring in rose gold tone, close up" fill sizes="14vw" />
            </div>
            {spotlight && (
              <Link
                href={`/products/${spotlight.slug}`}
                className="absolute -bottom-4 left-0 flex max-w-[16rem] items-center gap-3 rounded-2xl bg-card/95 p-3 pr-5 shadow-[0_20px_40px_-20px_rgba(90,60,40,0.45)] ring-1 ring-border backdrop-blur transition-transform hover:-translate-y-0.5 sm:left-2"
              >
                {spotlight.image && (
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ivory-deep">
                    <ProductImage src={spotlight.image.url} alt="" fill sizes="56px" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="eyebrow block text-[0.58rem] text-rose-deep">Customer favourite</span>
                  <span className="block truncate font-display text-lg leading-tight">{spotlight.name}</span>
                  <Price pricePaise={spotlight.pricePaise} compareAtPricePaise={spotlight.compareAtPricePaise} />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Category ribbon */}
      <div className="marquee overflow-hidden border-y border-rose-deep/30 bg-ivory-deep py-4 text-rose-deep" aria-hidden>
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0">
              {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
                <li key={i} className="flex items-center gap-8 px-4 font-display text-2xl italic whitespace-nowrap">
                  <span>{c.name}</span>
                  <span className="text-base not-italic text-champagne">✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* Promise strip */}
      <section aria-label="Why Shayara" className="bg-ivory">
        <ul className="container-page grid grid-cols-2 gap-6 py-10 text-sm md:grid-cols-4">
          {[
            { icon: Truck, title: 'Free shipping', text: 'On orders above ₹999' },
            { icon: RefreshCcw, title: '7-day returns', text: 'On eligible, unworn pieces' },
            { icon: ShieldCheck, title: 'Secure checkout', text: 'UPI, cards & netbanking via Razorpay' },
            { icon: Gem, title: 'Honest materials', text: 'Finish and base metal listed on every piece' },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-champagne-soft/70 ring-1 ring-champagne/40">
                <Icon className="size-5 text-rose-deep" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-charcoal">{title}</p>
                <p className="text-xs leading-5 text-charcoal-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ProductRail eyebrow="Handpicked" title="Our favourites" href="/shop" products={featured.items} />

      {/* Categories */}
      <section className="bg-glow py-16" aria-labelledby="shop-by-category">
        <div className="container-page">
          <div className="mb-10 text-center">
            <p className="ornament eyebrow mx-auto mb-3 max-w-xs text-rose-deep">Find your piece</p>
            <h2 id="shop-by-category" className="text-4xl sm:text-5xl">
              Shop by category
            </h2>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((c) => {
              const tile = CATEGORY_TILES[c.slug]!;
              return (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="group block text-center">
                    <div className={`arch relative aspect-[3/4] overflow-hidden bg-gradient-to-b ${tile.tint} ring-1 ring-card transition-shadow duration-500 group-hover:shadow-[0_24px_40px_-24px_rgba(90,60,40,0.5)]`}>
                      <ProductImage src={tile.image} alt="" fill sizes="(min-width: 768px) 18vw, 45vw" className="transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    <p className="mt-4 font-display text-2xl group-hover:text-rose-deep">{c.name}</p>
                    <p className="mt-0.5 text-xs text-charcoal-soft">{c.tagline}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Shop by finish */}
      <section className="container-page py-16" aria-labelledby="shop-by-finish">
        <div className="mb-10 text-center">
          <p className="ornament eyebrow mx-auto mb-3 max-w-xs text-rose-deep">Pick your tone</p>
          <h2 id="shop-by-finish" className="text-4xl sm:text-5xl">
            Shop by finish
          </h2>
        </div>
        <ul className="grid gap-5 md:grid-cols-3">
          {FINISH_TILES.map((f) => (
            <li key={f.finish}>
              <Link href={`/shop?finish=${f.finish}`} className="group relative flex items-center gap-5 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(90,60,40,0.45)]">
                <span className={`relative size-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${f.swatch} shadow-inner ring-4 ring-ivory`}>
                  <ProductImage src={f.image} alt="" fill sizes="96px" className="transition-transform duration-700 group-hover:scale-110" />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-2xl">{f.name}</span>
                  <span className="mt-0.5 block text-xs text-charcoal-soft">{f.note}</span>
                  <span className="eyebrow mt-3 inline-flex items-center gap-1.5 text-[0.62rem] text-rose-deep">
                    Shop now <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ProductRail eyebrow="Just in" title="New arrivals" href="/shop?sort=new" products={newArrivals.items} />

      {/* Editorial banner */}
      <section className="container-page py-10">
        <div className="relative grid overflow-hidden rounded-3xl bg-ivory-deep ring-1 ring-rose-deep/25 md:grid-cols-2">
          <div className="relative min-h-80">
            <ProductImage src="/images/editorial/stacking-edit.jpg" alt="Gold necklaces, earrings and a ring styled together" fill sizes="(min-width: 768px) 50vw, 100vw" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/40" />
          </div>
          <div className="relative flex flex-col justify-center p-10 md:p-16">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border border-champagne/20" />
            <p className="eyebrow mb-4 flex items-center gap-2 text-champagne">
              <span aria-hidden>✦</span> The stacking edit
            </p>
            <h2 className="text-4xl sm:text-5xl">
              Build a stack that&apos;s <span className="italic text-champagne">all you</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-charcoal-soft">
              Mix finishes, layer lengths and add a charm or two. Our pieces are designed to be worn together — start with one and keep going.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-7">
                <Link href="/categories/bracelets">Shop bracelets</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-7">
                <Link href="/categories/rings">Stackable rings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gifts by budget */}
      <section className="container-page py-16" aria-labelledby="gift-by-budget">
        <div className="flex flex-col items-start gap-8 rounded-3xl bg-rose-soft/60 p-8 ring-1 ring-rose/15 md:flex-row md:items-center md:p-12">
          <div className="max-w-xs">
            <p className="eyebrow mb-3 flex items-center gap-2 text-rose-deep">
              <Gift className="size-4" aria-hidden /> Gifting made easy
            </p>
            <h2 id="gift-by-budget" className="text-4xl">
              Gifts by budget
            </h2>
            <p className="mt-3 text-sm leading-6 text-charcoal-soft">Birthdays, Rakhi, anniversaries or just because — find something lovely at every price.</p>
          </div>
          <ul className="grid w-full flex-1 gap-4 sm:grid-cols-3">
            {BUDGETS.map((b) => (
              <li key={b.label}>
                <Link href={b.href} className="group flex h-full flex-col justify-between rounded-2xl bg-card p-6 ring-1 ring-border transition-all hover:-translate-y-1 hover:ring-rose-deep/40">
                  <span className="eyebrow text-[0.6rem]">{b.note}</span>
                  <span className="mt-6 flex items-end justify-between gap-2">
                    <span className="font-display text-3xl leading-none">{b.label}</span>
                    <ArrowRight className="size-4 shrink-0 text-rose-deep transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Shown only once there are real sales; the fallback would just repeat "Our favourites". */}
      {!bestsellers.fallback && <ProductRail eyebrow="Loved by customers" title="Bestsellers" href="/shop?sort=bestsellers" products={bestsellers.items} />}

      {/* Care guide */}
      <section className="container-page py-14" aria-labelledby="care-guide">
        <div className="mb-10 text-center">
          <p className="ornament eyebrow mx-auto mb-3 max-w-xs text-rose-deep">Keep it shining</p>
          <h2 id="care-guide" className="text-4xl sm:text-5xl">
            Caring for your pieces
          </h2>
        </div>
        <ul className="grid gap-10 md:grid-cols-3">
          {CARE_TIPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="text-center">
              <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-champagne-soft to-rose-soft ring-1 ring-champagne/40">
                <Icon className="size-6 text-rose-deep" aria-hidden />
                <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-rose-deep font-display text-sm text-ivory">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-2xl">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-charcoal-soft">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
