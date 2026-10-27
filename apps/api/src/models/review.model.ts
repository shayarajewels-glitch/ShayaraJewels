import { Schema, model, type Types } from 'mongoose';
import { REVIEW_STATUSES, type ReviewStatus } from '@shayara/shared';

export interface Review {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  /** The delivered order that makes this a verified purchase. */
  orderId: Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  moderationNote?: string | null;
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<Review>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    title: { type: String, required: true, maxlength: 100 },
    comment: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: REVIEW_STATUSES, default: 'pending', required: true },
    moderationNote: { type: String, maxlength: 300, default: null },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One review per customer per product.
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const ReviewModel = model<Review>('Review', reviewSchema);
