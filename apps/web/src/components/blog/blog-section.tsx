import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ProductType } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { serverApi } from '@/lib/api-server';
import { blogCategory, blogExcerpt } from '@/lib/blog';
import { formatDate } from '@/lib/utils';

/**
 * "From the journal": posts shown after the products. `general` lists posts
 * without a category (Shop all); a product type lists that category's posts.
 * Renders nothing when there are none.
 */
export async function BlogSection({ category }: { category: ProductType | 'general' }) {
  const { items } = await serverApi.blogs(category, 6);
  if (items.length === 0) return null;
  const name = category === 'general' ? null : blogCategory(category)?.name;
  return (
    <section aria-labelledby="journal" className="mt-20 border-t border-border pt-14">
      <div className="mb-8 text-center">
        <p className="ornament eyebrow mx-auto mb-3 max-w-xs text-rose-deep">From the journal</p>
        <h2 id="journal" className="text-3xl sm:text-4xl">
          {name ? `Stories & styling: ${name.toLowerCase()}` : 'Stories & styling notes'}
        </h2>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(212,175,55,0.22)]">
              <div className="relative aspect-[16/10] overflow-hidden bg-ivory-deep">
                <ProductImage src={post.image.url} alt={post.image.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-charcoal-soft">
                  {blogCategory(post.category)?.name ?? 'Journal'} · {formatDate(post.createdAt)}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-snug group-hover:text-rose-deep">{post.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-charcoal-soft">{blogExcerpt(post.content)}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-deep">
                  Read more <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
