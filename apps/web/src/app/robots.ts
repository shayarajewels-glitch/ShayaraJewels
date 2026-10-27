import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

/** Crawl hints only — private pages are protected by the API, not by robots.txt. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/cart', '/checkout', '/wishlist', '/search', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
