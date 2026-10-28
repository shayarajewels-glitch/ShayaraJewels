import { Types } from 'mongoose';
import {
  TOP_RATED_MIN_REVIEWS,
  type AdminReviewDto,
  type CreateReviewInput,
  type ReviewDto,
  type ReviewStatus,
} from '@shayara/shared';
import { isDuplicateKeyError } from '../../config/db';
import { OrderModel, ProductModel, ReviewModel, type Review, type User } from '../../models';
import { AppError, forbidden, notFound } from '../../utils/errors';
import { paginate } from '../../utils/http';

/** Statuses meaning the customer received the item. */
const RECEIVED_STATUSES = ['delivered', 'return_requested', 'returned'] as const;

function firstNameOnly(name: string): string {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : (first ?? 'Customer');
}

export function toReviewDto(r: Review, authorName: string): ReviewDto {
  return {
    id: r._id.toString(),
    productId: r.productId.toString(),
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    authorName: firstNameOnly(authorName),
    verifiedPurchase: true,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Recomputes rating aggregates from approved reviews so they never drift. */
export async function recomputeProductRating(productId: Types.ObjectId): Promise<void> {
  const [agg] = await ReviewModel.aggregate<{ avg: number; count: number }>([
    { $match: { productId, status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const averageRating = agg ? Math.round(agg.avg * 100) / 100 : 0;
  const reviewCount = agg?.count ?? 0;
  await ProductModel.updateOne(
    { _id: productId },
    { averageRating, reviewCount, ratingScore: reviewCount >= TOP_RATED_MIN_REVIEWS ? averageRating : 0 },
  );
}

export async function listApprovedReviews(productId: string, page: number, limit: number, sort: 'recent' | 'highest' | 'lowest') {
  const pid = new Types.ObjectId(productId);
  // Reviews are public only for products that are publicly visible.
  if (!(await ProductModel.exists({ _id: pid, status: 'published' }))) throw notFound('Product not found');
  const filter = { productId: pid, status: 'approved' as const };
  const order: Record<string, 1 | -1> =
    sort === 'highest' ? { rating: -1, createdAt: -1 } : sort === 'lowest' ? { rating: 1, createdAt: -1 } : { createdAt: -1 };
  const [docs, total, distribution] = await Promise.all([
    ReviewModel.find(filter).sort(order).skip((page - 1) * limit).limit(limit).populate<{ userId: Pick<User, '_id' | 'name'> }>('userId', 'name').lean(),
    ReviewModel.countDocuments(filter),
    ReviewModel.aggregate<{ _id: number; count: number }>([{ $match: filter }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ]);
  const items = docs.map((d) => toReviewDto({ ...d, userId: d.userId?._id ?? new Types.ObjectId() } as Review, d.userId?.name ?? 'Customer'));
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) dist[d._id] = d.count;
  return { ...paginate(items, total, page, limit), distribution: dist };
}

/**
 * Only customers who received the product in a delivered order may review it, once.
 * Reviews publish immediately; admins can reject (hide) them afterwards.
 */
export async function createReview(user: User, productId: string, input: CreateReviewInput) {
  const product = await ProductModel.findOne({ _id: productId, status: { $ne: 'draft' } }).select('_id').lean();
  if (!product) throw notFound('Product not found');
  const order = await OrderModel.findOne({
    userId: user._id,
    status: { $in: RECEIVED_STATUSES },
    'items.productId': product._id,
  })
    .sort({ createdAt: -1 })
    .select('_id')
    .lean();
  if (!order) {
    throw new AppError(403, 'NOT_VERIFIED_PURCHASE', 'You can review this product after it has been delivered to you');
  }
  try {
    const review = await ReviewModel.create({ ...input, userId: user._id, productId: product._id, orderId: order._id, status: 'approved' });
    await recomputeProductRating(product._id);
    return toReviewDto(review, user.name);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this product');
    throw err;
  }
}

export async function updateOwnReview(user: User, reviewId: string, input: Partial<CreateReviewInput>) {
  const review = await ReviewModel.findById(reviewId);
  if (!review) throw notFound('Review not found');
  if (!review.userId.equals(user._id)) throw forbidden('You can only edit your own reviews');
  if (input.rating !== undefined) review.rating = input.rating;
  if (input.title !== undefined) review.title = input.title;
  if (input.comment !== undefined) review.comment = input.comment;
  // Edits stay published; a review an admin rejected stays hidden.
  if (review.status !== 'rejected') review.status = 'approved';
  await review.save();
  await recomputeProductRating(review.productId);
  return toReviewDto(review, user.name);
}

export async function deleteReview(user: User, reviewId: string) {
  const review = await ReviewModel.findById(reviewId);
  if (!review) throw notFound('Review not found');
  if (!review.userId.equals(user._id) && user.role !== 'admin') throw forbidden('You can only delete your own reviews');
  await review.deleteOne();
  if (review.status === 'approved') await recomputeProductRating(review.productId);
}

export async function listMyReviews(userId: Types.ObjectId) {
  const docs = await ReviewModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean<Review[]>();
  return docs;
}

/* --------------------------------- admin --------------------------------- */

export async function adminListReviews(page: number, limit: number, status?: ReviewStatus) {
  const filter = status ? { status } : {};
  const [docs, total] = await Promise.all([
    ReviewModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{ userId: Pick<User, '_id' | 'name' | 'email'> | null }>('userId', 'name email')
      .populate<{ productId: { _id: Types.ObjectId; name: string; slug: string } | null }>('productId', 'name slug')
      .populate<{ orderId: { _id: Types.ObjectId; orderNumber: string } | null }>('orderId', 'orderNumber')
      .lean(),
    ReviewModel.countDocuments(filter),
  ]);
  const items: AdminReviewDto[] = docs.map((d) => ({
    id: d._id.toString(),
    productId: d.productId?._id.toString() ?? '',
    rating: d.rating,
    title: d.title,
    comment: d.comment,
    authorName: d.userId?.name ?? 'Deleted user',
    verifiedPurchase: true,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    product: d.productId ? { id: d.productId._id.toString(), name: d.productId.name, slug: d.productId.slug } : null,
    user: d.userId ? { id: d.userId._id.toString(), name: d.userId.name, email: d.userId.email } : null,
    orderNumber: d.orderId?.orderNumber ?? null,
    moderationNote: d.moderationNote ?? undefined,
  }));
  return paginate(items, total, page, limit);
}

export async function moderateReview(reviewId: string, adminId: Types.ObjectId, status: 'approved' | 'rejected', note?: string) {
  const review = await ReviewModel.findById(reviewId);
  if (!review) throw notFound('Review not found');
  // Re-check the verified-purchase link at approval time.
  if (status === 'approved') {
    const qualifying = await OrderModel.exists({
      _id: review.orderId,
      userId: review.userId,
      status: { $in: RECEIVED_STATUSES },
      'items.productId': review.productId,
    });
    if (!qualifying) throw new AppError(409, 'NOT_VERIFIED_PURCHASE', 'The qualifying order for this review is no longer valid');
  }
  review.status = status;
  review.moderationNote = note ?? null;
  review.moderatedBy = adminId;
  review.moderatedAt = new Date();
  await review.save();
  await recomputeProductRating(review.productId);
  return review;
}
