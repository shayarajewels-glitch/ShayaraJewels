import { Router, type Response } from 'express';
import { z } from 'zod';
import { productQuerySchema, slugSchema } from '@shayara/shared';
import { parseParams, parseQuery } from '../../utils/http';
import {
  getCollection,
  getPublishedProductBySlug,
  listCategories,
  listProducts,
  listPublishedSlugs,
  relatedProducts,
  type CollectionName,
} from './products.service';

/** Public catalogue responses may be cached briefly by browsers and CDNs. */
const cachePublic = (res: Response, seconds = 60) =>
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);

const slugParams = z.object({ slug: slugSchema });
const collectionQuery = z.object({ limit: z.coerce.number().int().min(1).max(24).default(8) });

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const query = parseQuery(req, productQuerySchema);
  cachePublic(res).json(await listProducts(query));
});

const collections: CollectionName[] = ['featured', 'bestsellers', 'new-arrivals', 'top-rated'];
for (const name of collections) {
  productsRouter.get(`/${name}`, async (req, res) => {
    const { limit } = parseQuery(req, collectionQuery);
    cachePublic(res).json(await getCollection(name, limit));
  });
}

productsRouter.get('/sitemap', async (_req, res) => {
  const items = await listPublishedSlugs();
  cachePublic(res, 600).json({ items: items.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })) });
});

productsRouter.get('/:slug/related', async (req, res) => {
  const { slug } = parseParams(req, slugParams);
  cachePublic(res).json({ items: await relatedProducts(slug) });
});

productsRouter.get('/:slug', async (req, res) => {
  const { slug } = parseParams(req, slugParams);
  cachePublic(res).json(await getPublishedProductBySlug(slug));
});

export const categoriesRouter = Router();
categoriesRouter.get('/', async (_req, res) => {
  cachePublic(res, 300).json({ items: await listCategories() });
});

/** GET /search — same engine as /products, kept as a dedicated endpoint for the search page. */
export const searchRouter = Router();
searchRouter.get('/', async (req, res) => {
  const query = parseQuery(req, productQuerySchema.extend({ q: z.string().trim().min(1, 'Enter a search term').max(80) }));
  cachePublic(res, 30).json({ query: query.q, ...(await listProducts(query)) });
});
