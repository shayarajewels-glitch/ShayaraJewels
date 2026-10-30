import { ArrowRight, Newspaper } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/page-heading';
import { ProductImage } from '@/components/product/product-image';
import { EmptyState } from '@/components/ui/misc';
import { serverApi } from '@/lib/api-server';
import { blogCategory, blogExcerpt } from '@/lib/blog';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blogs – Jewellery Styling Tips, Care Guides & Stories',
  description: 'Styling ideas, jewellery care guides and stories from Shayara: how to layer, stack and look after your fashion jewellery.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndexPage() {
  const { items } = await serverApi.blogs();
  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="From the journal"
        title="Blogs"
        description="Styling ideas, care guides and the stories behind our pieces."
        crumbs={[{ href: '/', label: 'Home' }, { label: 'Blogs' }]}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Newspaper />} title="No posts yet">
          New stories are on their way. Meanwhile, explore the collection.
        </EmptyState>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post, i) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(212,175,55,0.22)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ivory-deep">
                  <ProductImage
                    src={post.image.url}
                    alt={post.image.alt}
                    fill
                    priority={i < 3}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs text-charcoal-soft">
                    {blogCategory(post.category)?.name ?? 'Journal'} · {formatDate(post.createdAt)}
                  </p>
                  <h2 className="mt-2 font-display text-2xl leading-snug group-hover:text-rose-deep">{post.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-charcoal-soft">{blogExcerpt(post.content)}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-deep">
                    Read more <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
