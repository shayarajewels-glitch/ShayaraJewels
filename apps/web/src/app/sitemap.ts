import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@shayara/shared';
import { serverApi } from '@/lib/api-server';
import { SITE_URL } from '@/lib/config';

export const revalidate = 3600;

/** Public, indexable URLs only: no account, admin, cart, checkout or filtered listings. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ items }, blogs] = await Promise.all([serverApi.sitemap(), serverApi.blogSitemap()]);
  const staticPages = ['', '/shop', '/blog', '/about', '/contact', '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms'];
  return [
    ...staticPages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.5 })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/categories/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...items.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...blogs.items.map((b) => ({ url: `${SITE_URL}/blog/${b.slug}`, lastModified: new Date(b.updatedAt), changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}
