import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { FINISHES, PRODUCT_STATUSES, PRODUCT_TYPES, type Finish, type ProductStatus, type ProductType } from '@shayara/shared';

export interface ProductImage {
  url: string;
  key?: string;
  alt: string;
  sortOrder: number;
}

export interface ProductVideo {
  url: string;
  key?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
}

export interface Product {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  description: string;
  type: ProductType;
  finish: Finish;
  /** The actual base metal/material (e.g. "Brass", "Stainless steel"). Never implies precious metal. */
  baseMaterial?: string | null;
  sizeOptions: string[];
  careInstructions?: string | null;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  /** Units available to sell. Reservations for unpaid orders are already deducted. */
  stock: number;
  images: ProductImage[];
  videos: ProductVideo[];
  averageRating: number;
  reviewCount: number;
  /** averageRating when reviewCount >= TOP_RATED_MIN_REVIEWS, else 0. Drives "top rated" sorting. */
  ratingScore: number;
  /** Units in confirmed (paid or COD-confirmed), non-cancelled orders. */
  unitsSold: number;
  status: ProductStatus;
  featured: boolean;
  publishedAt?: Date | null;
  searchKeywords: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<ProductImage>(
  {
    url: { type: String, required: true, maxlength: 2048 },
    key: { type: String, maxlength: 200 },
    alt: { type: String, required: true, maxlength: 160 },
    sortOrder: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const videoSchema = new Schema<ProductVideo>(
  {
    url: { type: String, required: true, maxlength: 2048 },
    key: { type: String, maxlength: 200 },
    thumbnailUrl: { type: String, maxlength: 2048 },
    thumbnailKey: { type: String, maxlength: 200 },
  },
  { _id: false },
);

const productSchema = new Schema<Product>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, required: true, maxlength: 5000 },
    type: { type: String, enum: PRODUCT_TYPES, required: true },
    finish: { type: String, enum: FINISHES, required: true },
    baseMaterial: { type: String, maxlength: 80, default: null },
    sizeOptions: { type: [String], default: [] },
    careInstructions: { type: String, maxlength: 1000, default: null },
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPricePaise: { type: Number, min: 0, default: null, validate: (v: number | null) => v == null || Number.isInteger(v) },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    images: { type: [imageSchema], default: [] },
    videos: { type: [videoSchema], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    ratingScore: { type: Number, default: 0, min: 0, max: 5 },
    unitsSold: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', required: true },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    searchKeywords: { type: [String], default: [] },
    seoTitle: { type: String, maxlength: 70, default: null },
    seoDescription: { type: String, maxlength: 170, default: null },
  },
  { timestamps: true },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
// Listing indexes: every public query filters on status first.
productSchema.index({ status: 1, type: 1, createdAt: -1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, pricePaise: 1 });
productSchema.index({ status: 1, type: 1, pricePaise: 1 });
productSchema.index({ status: 1, unitsSold: -1 });
productSchema.index({ status: 1, ratingScore: -1, reviewCount: -1 });
productSchema.index({ status: 1, featured: 1, createdAt: -1 });
productSchema.index({ stock: 1, status: 1 });
productSchema.index(
  { name: 'text', searchKeywords: 'text', type: 'text', finish: 'text', description: 'text' },
  { weights: { name: 10, searchKeywords: 6, type: 4, finish: 4, description: 1 }, name: 'product_text', default_language: 'english' },
);

export type ProductDocument = HydratedDocument<Product>;
export const ProductModel = model<Product>('Product', productSchema);
