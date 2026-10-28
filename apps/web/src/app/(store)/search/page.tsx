import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES } from '@shayara/shared';
import { CatalogueListing, type RawSearchParams } from '@/components/product/catalogue-listing';
import { PageHeading } from '@/components/layout/page-heading';
import { PromoCarousel } from '@/components/promo/promo-carousel';
import { EmptyState } from '@/components/ui/misc';

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const q = (await searchParams).q;
  return {
    title: q ? `Search: ${String(q).slice(0, 60)}` : 'Search',
    // Search result pages are not indexed.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  return (
    <div className="container-page py-10">
      <PromoCarousel className="mb-8" />
      <PageHeading eyebrow="Search" title={q ? `Results for “${q}”` : 'Search Shayara'} crumbs={[{ href: '/', label: 'Home' }, { label: 'Search' }]} />
      {q ? (
        <CatalogueListing basePath="/search" searchParams={{ ...sp, q }} mode="search" />
      ) : (
        <EmptyState icon={<Search />} title="What are you looking for?">
          <p>Use the search icon above, or start with a category:</p>
          <p className="mt-3 flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="text-rose-deep underline underline-offset-4">
                {c.name}
              </Link>
            ))}
          </p>
        </EmptyState>
      )}
    </div>
  );
}
