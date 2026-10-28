import type { Metadata } from 'next';
import { CatalogueListing, hasNonIndexableParams, type RawSearchParams } from '@/components/product/catalogue-listing';
import { PageHeading } from '@/components/layout/page-heading';
import { PromoCarousel } from '@/components/promo/promo-carousel';

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const page = Number(sp.page) > 1 ? Number(sp.page) : 1;
  return {
    title: `Shop All Artificial Jewellery – Rings, Necklaces, Bangles & Anklets${page > 1 ? ` — page ${page}` : ''}`,
    description:
      'Browse all Shayara fashion jewellery: rings, necklaces, pendants, bracelets, bangles and anklets in gold, silver and rose gold tones. Free shipping over ₹999 and easy 7-day returns.',
    alternates: { canonical: page > 1 ? `/shop?page=${page}` : '/shop' },
    robots: hasNonIndexableParams(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  return (
    <div className="container-page py-10">
      <PromoCarousel className="mb-8" />
      <PageHeading eyebrow="The collection" title="Shop all jewellery" crumbs={[{ href: '/', label: 'Home' }, { label: 'Shop' }]} />
      <CatalogueListing basePath="/shop" searchParams={sp} />
    </div>
  );
}
