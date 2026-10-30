import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { BlogDto } from '@shayara/shared';
import { PageHeading } from '@/components/layout/page-heading';
import { ProductImage } from '@/components/product/product-image';
import { ApiNotFoundError, serverApi } from '@/lib/api-server';
import { blogCategory, blogExcerpt, blogParagraphs } from '@/lib/blog';
import { SITE_NAME, SITE_URL } from '@/lib/config';
import { jsonLd } from '@/lib/json-ld';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

async function loadPost(slug: string): Promise<BlogDto> {
  try {
    return await serverApi.blog(slug);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    throw err;
  }
}

const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  const description = blogExcerpt(post.content, 155);
  const images = [{ url: absolute(post.image.url), alt: post.image.alt }];
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description, url: `/blog/${post.slug}`, images, publishedTime: post.createdAt, modifiedTime: post.updatedAt },
    twitter: { card: 'summary_large_image', title: post.title, description, images: images.map((i) => i.url) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await loadPost((await params).slug);
  const category = blogCategory(post.category);
  const backHref = category ? `/categories/${category.slug}` : '/shop';
  const backLabel = category ? category.name : 'Shop';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: [absolute(post.image.url)],
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="container-page max-w-3xl py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <PageHeading
        eyebrow={`${category?.name ?? 'Journal'} · ${formatDate(post.createdAt)}`}
        title={post.title}
        crumbs={[{ href: '/', label: 'Home' }, { href: backHref, label: backLabel }, { label: post.title }]}
      />
      <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl bg-ivory-deep ring-1 ring-border">
        <ProductImage src={post.image.url} alt={post.image.alt} fill priority sizes="(min-width: 768px) 768px, 100vw" />
      </div>
      <div className="prose-shayara">
        {blogParagraphs(post.content).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-12 border-t border-border pt-8">
        <Link href={backHref} className="text-sm font-semibold text-rose-deep hover:underline">
          ← Shop {category ? category.name.toLowerCase() : 'all jewellery'}
        </Link>
      </div>
    </article>
  );
}
