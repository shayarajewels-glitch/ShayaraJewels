import { Router } from 'express';
import type { RateLimiters } from './middleware/rate-limit';
import { adminRouter } from './modules/admin/admin.routes';
import { buildAuthRouter } from './modules/auth/auth.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { couponsRouter } from './modules/coupons/coupons.routes';
import { buildCheckoutRouter } from './modules/checkout/checkout.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { categoriesRouter, productsRouter, searchRouter } from './modules/products/products.routes';
import { buildProductReviewsRouter, reviewsRouter } from './modules/reviews/reviews.routes';
import { usersRouter } from './modules/users/users.routes';

/** Everything under /api/v1. Webhooks and uploads are mounted separately in app.ts. */
export function buildApiRouter(limiters: RateLimiters): Router {
  const api = Router();
  api.use('/auth', buildAuthRouter(limiters));
  api.use('/users', usersRouter);
  api.use('/products/:productId/reviews', buildProductReviewsRouter(limiters));
  api.use('/products', productsRouter);
  api.use('/categories', categoriesRouter);
  api.use('/search', searchRouter);
  api.use('/cart', cartRouter);
  api.use('/coupons', couponsRouter);
  api.use('/checkout', buildCheckoutRouter(limiters));
  api.use('/orders', ordersRouter);
  api.use('/payments', paymentsRouter);
  api.use('/reviews', reviewsRouter);
  api.use('/admin', adminRouter);
  return api;
}
