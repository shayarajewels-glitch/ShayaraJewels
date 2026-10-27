import { Router } from 'express';
import { z } from 'zod';
import { createReviewSchema, objectIdSchema, reviewListQuerySchema, updateReviewSchema } from '@shayara/shared';
import type { RateLimiters } from '../../middleware/rate-limit';
import { currentUser, requireAuth } from '../../middleware/security';
import { parseBody, parseParams, parseQuery } from '../../utils/http';
import { createReview, deleteReview, listApprovedReviews, listMyReviews, updateOwnReview } from './reviews.service';

const productParams = z.object({ productId: objectIdSchema });
const idParams = z.object({ id: objectIdSchema });

/** Mounted at /products/:productId/reviews. */
export function buildProductReviewsRouter(limiters: RateLimiters): Router {
  const router = Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    const { productId } = parseParams(req, productParams);
    const { page, limit, sort } = parseQuery(req, reviewListQuerySchema);
    res.set('Cache-Control', 'public, max-age=60').json(await listApprovedReviews(productId, page, limit, sort));
  });

  router.post('/', requireAuth, limiters.review, async (req, res) => {
    const { productId } = parseParams(req, productParams);
    const input = parseBody(req, createReviewSchema);
    res.status(201).json(await createReview(currentUser(req), productId, input));
  });

  return router;
}

/** Mounted at /reviews. */
export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

reviewsRouter.get('/mine', async (req, res) => {
  const reviews = await listMyReviews(currentUser(req)._id);
  res.json({
    items: reviews.map((r) => ({
      id: r._id.toString(),
      productId: r.productId.toString(),
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

reviewsRouter.patch('/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  const input = parseBody(req, updateReviewSchema);
  res.json(await updateOwnReview(currentUser(req), id, input));
});

reviewsRouter.delete('/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  await deleteReview(currentUser(req), id);
  res.status(204).end();
});
