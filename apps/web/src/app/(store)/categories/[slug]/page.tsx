import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES, categoryBySlug } from '@shayara/shared';
import { CatalogueListing, hasNonIndexableParams, type RawSearchParams } from '@/components/product/catalogue-listing';
import { PageHeading } from '@/components/layout/page-heading';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = categoryBySlug(slug);
  if (!category) return {};
  const page = Number(sp.page) > 1 ? Number(sp.page) : 1;
  const filtered = Object.keys(sp).some((k) => k !== 'page');
  return {
    title: `${category.name}${page > 1 ? ` — page ${page}` : ''}`,
    description: `${category.description} Shop Shayara ${category.name.toLowerCase()} in gold, silver and rose gold tones.`,
    alternates: { canonical: `/categories/${slug}${page > 1 ? `?page=${page}` : ''}` },
    openGraph: { title: `${category.name} | Shayara`, description: category.description, url: `/categories/${slug}` },
    robots: filtered && hasNonIndexableParams(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = categoryBySlug(slug);
  if (!category) notFound();
  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow={category.tagline}
        title={category.name}
        description={category.description}
        crumbs={[{ href: '/', label: 'Home' }, { href: '/shop', label: 'Shop' }, { label: category.name }]}
      />
      <CatalogueListing basePath={`/categories/${slug}`} searchParams={sp} fixedType={category.type} />
    </div>
  );
}
