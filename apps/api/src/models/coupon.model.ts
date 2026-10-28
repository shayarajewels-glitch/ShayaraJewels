import { Schema, model, type Types } from 'mongoose';
import { PRODUCT_TYPES, type ProductType } from '@shayara/shared';

export interface CouponImage {
  url: string;
  key?: string | null;
  alt: string;
}

/** A percentage discount code, optionally limited to product types, shown in the storefront carousel. */
export interface Coupon {
  _id: Types.ObjectId;
  /** Stored upper-case. */
  code: string;
  title: string;
  description: string;
  discountPercent: number;
  /** Empty means the whole store. */
  appliesTo: ProductType[];
  image: CouponImage | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<Coupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 24 },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    discountPercent: { type: Number, required: true, min: 1, max: 90, validate: Number.isInteger },
    appliesTo: { type: [{ type: String, enum: PRODUCT_TYPES }], default: [] },
    image: {
      type: new Schema<CouponImage>({ url: { type: String, required: true, maxlength: 500 }, key: { type: String, default: null }, alt: { type: String, default: '' } }, { _id: false }),
      default: null,
    },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ active: 1, sortOrder: 1 });

export const CouponModel = model<Coupon>('Coupon', couponSchema);
