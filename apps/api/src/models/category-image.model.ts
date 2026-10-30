import { Schema, model, type Types } from 'mongoose';
import { PRODUCT_TYPES, type ProductType } from '@shayara/shared';

/** The picture shown on a category tile, chosen in admin. One document per product type. */
export interface CategoryImage {
  _id: Types.ObjectId;
  type: ProductType;
  url: string;
  key: string | null;
  alt: string;
  createdAt: Date;
  updatedAt: Date;
}

const categoryImageSchema = new Schema<CategoryImage>(
  {
    type: { type: String, enum: PRODUCT_TYPES, required: true },
    url: { type: String, required: true, maxlength: 500 },
    key: { type: String, default: null },
    alt: { type: String, default: '', maxlength: 160 },
  },
  { timestamps: true },
);

categoryImageSchema.index({ type: 1 }, { unique: true });

export const CategoryImageModel = model<CategoryImage>('CategoryImage', categoryImageSchema);
