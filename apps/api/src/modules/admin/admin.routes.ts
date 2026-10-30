import { Router } from 'express';
import { z } from 'zod';
import {
  adminOrderQuerySchema,
  adminOrderStatusSchema,
  adminProductQuerySchema,
  adminRefundSchema,
  adminReviewModerationSchema,
  adminReviewQuerySchema,
  blogInputSchema,
  categoryImageInputSchema,
  couponInputSchema,
  couponUpdateSchema,
  createProductSchema,
  objectIdSchema,
  PRODUCT_TYPES,
  stockUpdateSchema,
  updateProductSchema,
} from '@shayara/shared';
import { currentUser, requireAdmin } from '../../middleware/security';
import { parseBody, parseParams, parseQuery } from '../../utils/http';
import { adminCreateBlog, adminDeleteBlog, adminGetBlog, adminListBlogs, adminUpdateBlog } from '../blogs/blogs.service';
import { adminListCategoryImages, adminSetCategoryImage } from '../categories/category-images.service';
import { adminCreateCoupon, adminDeleteCoupon, adminGetCoupon, adminListCoupons, adminUpdateCoupon } from '../coupons/coupons.service';
import { adminListReviews, moderateReview } from '../reviews/reviews.service';
import { adminUploadsRouter } from '../uploads/uploads.routes';
import { adminDashboard, adminGetOrder, adminListOrders, adminRefundOrder, adminUpdateOrderStatus } from './admin-orders.service';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminListProducts,
  adminUpdateProduct,
  adminUpdateStock,
} from './admin-products.service';

const idParams = z.object({ id: objectIdSchema });

export const adminRouter = Router();
// Every admin route requires an authenticated admin, checked against the database.
adminRouter.use(requireAdmin, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

adminRouter.get('/dashboard', async (_req, res) => {
  res.json(await adminDashboard());
});

/* Products */
adminRouter.get('/products', async (req, res) => {
  res.json(await adminListProducts(parseQuery(req, adminProductQuerySchema)));
});
adminRouter.get('/products/:id', async (req, res) => {
  res.json(await adminGetProduct(parseParams(req, idParams).id));
});
adminRouter.post('/products', async (req, res) => {
  res.status(201).json(await adminCreateProduct(parseBody(req, createProductSchema)));
});
adminRouter.patch('/products/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminUpdateProduct(id, parseBody(req, updateProductSchema)));
});
adminRouter.delete('/products/:id', async (req, res) => {
  res.json(await adminDeleteProduct(parseParams(req, idParams).id));
});
adminRouter.patch('/products/:id/stock', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminUpdateStock(id, parseBody(req, stockUpdateSchema), currentUser(req)._id));
});

/* Orders */
adminRouter.get('/orders', async (req, res) => {
  res.json(await adminListOrders(parseQuery(req, adminOrderQuerySchema)));
});
adminRouter.get('/orders/:id', async (req, res) => {
  res.json(await adminGetOrder(parseParams(req, idParams).id));
});
adminRouter.patch('/orders/:id/status', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminUpdateOrderStatus(id, parseBody(req, adminOrderStatusSchema)));
});
adminRouter.post('/orders/:id/refund', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminRefundOrder(id, parseBody(req, adminRefundSchema), currentUser(req)._id));
});

/* Reviews */
adminRouter.get('/reviews', async (req, res) => {
  const { page, limit, status } = parseQuery(req, adminReviewQuerySchema);
  res.json(await adminListReviews(page, limit, status));
});
adminRouter.patch('/reviews/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  const { status, moderationNote } = parseBody(req, adminReviewModerationSchema);
  const review = await moderateReview(id, currentUser(req)._id, status, moderationNote);
  res.json({ id: review._id.toString(), status: review.status });
});

/* Coupons */
adminRouter.get('/coupons', async (_req, res) => {
  res.json({ items: await adminListCoupons() });
});
adminRouter.get('/coupons/:id', async (req, res) => {
  res.json(await adminGetCoupon(parseParams(req, idParams).id));
});
adminRouter.post('/coupons', async (req, res) => {
  res.status(201).json(await adminCreateCoupon(parseBody(req, couponInputSchema)));
});
adminRouter.patch('/coupons/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminUpdateCoupon(id, parseBody(req, couponUpdateSchema)));
});
adminRouter.delete('/coupons/:id', async (req, res) => {
  await adminDeleteCoupon(parseParams(req, idParams).id);
  res.status(204).end();
});

/* Blogs */
adminRouter.get('/blogs', async (_req, res) => {
  res.json({ items: await adminListBlogs() });
});
adminRouter.get('/blogs/:id', async (req, res) => {
  res.json(await adminGetBlog(parseParams(req, idParams).id));
});
adminRouter.post('/blogs', async (req, res) => {
  res.status(201).json(await adminCreateBlog(parseBody(req, blogInputSchema)));
});
adminRouter.patch('/blogs/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  res.json(await adminUpdateBlog(id, parseBody(req, blogInputSchema)));
});
adminRouter.delete('/blogs/:id', async (req, res) => {
  await adminDeleteBlog(parseParams(req, idParams).id);
  res.status(204).end();
});

/* Category pictures */
adminRouter.get('/category-images', async (_req, res) => {
  res.json({ items: await adminListCategoryImages() });
});
adminRouter.patch('/category-images/:type', async (req, res) => {
  const { type } = parseParams(req, z.object({ type: z.enum(PRODUCT_TYPES) }));
  res.json({ items: await adminSetCategoryImage(type, parseBody(req, categoryImageInputSchema)) });
});

/* Uploads */
adminRouter.use('/uploads', adminUploadsRouter);
