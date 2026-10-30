import { Router } from 'express';
import { z } from 'zod';
import { blogListQuerySchema, slugSchema } from '@shayara/shared';
import { parseParams, parseQuery } from '../../utils/http';
import { getBlogBySlug, listBlogSlugs, listBlogs } from './blogs.service';

/** Public: journal posts for the shop and category pages. */
export const blogsRouter = Router();

blogsRouter.get('/', async (req, res) => {
  const { category, limit } = parseQuery(req, blogListQuerySchema);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ items: await listBlogs(category, limit) });
});

/** Slugs and timestamps for the sitemap. */
blogsRouter.get('/sitemap', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ items: (await listBlogSlugs()).map((b) => ({ slug: b.slug, updatedAt: b.updatedAt.toISOString() })) });
});

blogsRouter.get('/:slug', async (req, res) => {
  const { slug } = parseParams(req, z.object({ slug: slugSchema }));
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await getBlogBySlug(slug));
});
