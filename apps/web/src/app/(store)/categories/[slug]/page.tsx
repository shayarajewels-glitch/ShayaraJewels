import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES, categoryBySlug } from '@shayara/shared';
import { CatalogueListing, hasNonIndexableParams, type RawSearchParams } from '@/components/product/catalogue-listing';
import { PageHeading } from '@/components/layout/page-heading';
import { CATEGORY_SEO } from '@/lib/seo-copy';

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
  const seo = CATEGORY_SEO[slug]!;
  return {
    title: `${seo.title}${page > 1 ? ` — page ${page}` : ''}`,
    description: seo.description,
    alternates: { canonical: `/categories/${slug}${page > 1 ? `?page=${page}` : ''}` },
    openGraph: { title: `${seo.title} | Shayara`, description: seo.description, url: `/categories/${slug}` },
    robots: filtered && hasNonIndexableParams(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = categoryBySlug(slug);
  if (!category) notFound();
  const seo = CATEGORY_SEO[slug]!;
  const firstPage = !(Number(sp.page) > 1);
  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow={category.tagline}
        title={category.name}
        description={category.description}
        crumbs={[{ href: '/', label: 'Home' }, { href: '/shop', label: 'Shop' }, { label: category.name }]}
      />
      <CatalogueListing basePath={`/categories/${slug}`} searchParams={sp} fixedType={category.type} />
      {firstPage && (
        <section aria-labelledby="category-guide" className="mt-20 grid gap-10 border-t border-border pt-14 lg:grid-cols-2">
          <div className="prose-shayara">
            <h2 id="category-guide" className="!mt-0">
              Shop {category.name.toLowerCase()} at Shayara
            </h2>
            {seo.intro.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <div>
            <h2 className="mb-4 text-2xl">Common questions</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {seo.faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-semibold text-charcoal marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="text-rose-deep transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-charcoal-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
