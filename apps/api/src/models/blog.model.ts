import { Schema, model, type Types } from 'mongoose';
import { PRODUCT_TYPES, type ProductType } from '@shayara/shared';

/** A journal post shown after the products on Shop all (no category) or on its category page. */
export interface Blog {
  _id: Types.ObjectId;
  title: string;
  /** Set once from the title and kept when the title is edited, so links keep working. */
  slug: string;
  category: ProductType | null;
  content: string;
  image: { url: string; key: string | null; alt: string };
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<Blog>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, maxlength: 110 },
    category: { type: String, enum: [...PRODUCT_TYPES, null], default: null },
    content: { type: String, required: true, maxlength: 20_000 },
    image: {
      type: new Schema({ url: { type: String, required: true, maxlength: 500 }, key: { type: String, default: null }, alt: { type: String, default: '' } }, { _id: false }),
      required: true,
    },
  },
  { timestamps: true },
);

blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ category: 1, createdAt: -1 });

export const BlogModel = model<Blog>('Blog', blogSchema);
