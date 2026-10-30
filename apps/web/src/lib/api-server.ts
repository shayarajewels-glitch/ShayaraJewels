import 'server-only';
import type { BlogDto, CategoryDto, Paginated, ProductDetailDto, ProductSummaryDto, PublicCouponDto, ReviewDto } from '@shayara/shared';
import { PUBLIC_API_BASE_URL } from './config';

/** The Next.js server may reach the API on a private address. */
const BASE = (process.env.API_INTERNAL_BASE_URL || PUBLIC_API_BASE_URL).replace(/\/$/, '');

/** All catalogue data shares one tag; the API invalidates it whenever products, stock or reviews change. */
export const CATALOGUE_CACHE_TAG = 'catalogue';

export class ApiNotFoundError extends Error {}

/**
 * Server-side fetch for public catalogue data (no cookies). Responses are
 * cached by Next.js for a short time so pages stay fast and fresh.
 */
async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate, tags: [CATALOGUE_CACHE_TAG] }, headers: { Accept: 'application/json' } });
  if (res.status === 404) throw new ApiNotFoundError(path);
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Like `get`, but returns a fallback when the API is unreachable (keeps the homepage up). */
async function getOr<T>(path: string, fallback: T, revalidate = 60): Promise<T> {
  try {
    return await get<T>(path, revalidate);
  } catch {
    return fallback;
  }
}

export type ProductListResponse = Paginated<ProductSummaryDto>;
export type Collection = { items: ProductSummaryDto[]; fallback: boolean };

export const serverApi = {
  products: (qs: string) => get<ProductListResponse>(`/products${qs ? `?${qs}` : ''}`, 60),
  search: (qs: string) => get<ProductListResponse & { query: string }>(`/search?${qs}`, 30),
  product: (slug: string) => get<ProductDetailDto>(`/products/${encodeURIComponent(slug)}`, 60),
  related: (slug: string) => getOr<{ items: ProductSummaryDto[] }>(`/products/${encodeURIComponent(slug)}/related`, { items: [] }),
  reviews: (productId: string) =>
    getOr<Paginated<ReviewDto> & { distribution: Record<number, number> }>(`/products/${productId}/reviews?limit=6`, {
      items: [],
      page: 1,
      limit: 6,
      total: 0,
      totalPages: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
  collection: (name: 'featured' | 'bestsellers' | 'new-arrivals' | 'top-rated', limit = 8) =>
    getOr<Collection>(`/products/${name}?limit=${limit}`, { items: [], fallback: true }),
  categories: () => getOr<{ items: CategoryDto[] }>('/categories', { items: [] }, 60),
  sitemap: () => getOr<{ items: { slug: string; updatedAt: string }[] }>('/products/sitemap', { items: [] }, 600),
  /** Live coupons for the promo carousel; an outage just shows the default slides. */
  coupons: () => getOr<{ items: PublicCouponDto[] }>('/coupons', { items: [] }, 60),
  /** Every journal post, newest first. An outage just shows an empty journal. */
  blogs: (limit = 48) => getOr<{ items: BlogDto[] }>(`/blogs?limit=${limit}`, { items: [] }, 60),
  blog: (slug: string) => get<BlogDto>(`/blogs/${encodeURIComponent(slug)}`, 60),
  blogSitemap: () => getOr<{ items: { slug: string; updatedAt: string }[] }>('/blogs/sitemap', { items: [] }, 600),
};
