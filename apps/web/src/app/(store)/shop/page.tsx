import type { Metadata } from 'next';
import { CatalogueListing, hasNonIndexableParams, type RawSearchParams } from '@/components/product/catalogue-listing';
import { PageHeading } from '@/components/layout/page-heading';

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const page = Number(sp.page) > 1 ? Number(sp.page) : 1;
  return {
    title: page > 1 ? `Shop all jewellery — page ${page}` : 'Shop all jewellery',
    description: 'Browse all Shayara rings, necklaces, pendants, bracelets and anklets in gold, silver and rose gold tones.',
    alternates: { canonical: page > 1 ? `/shop?page=${page}` : '/shop' },
    robots: hasNonIndexableParams(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="The collection" title="Shop all jewellery" crumbs={[{ href: '/', label: 'Home' }, { label: 'Shop' }]} />
      <CatalogueListing basePath="/shop" searchParams={sp} />
    </div>
  );
}
