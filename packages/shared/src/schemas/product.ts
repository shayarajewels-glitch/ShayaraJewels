import { z } from 'zod';
import { FINISHES, PRODUCT_SORTS, PRODUCT_STATUSES, PRODUCT_TYPES } from '../constants/catalogue';
import { objectIdSchema, paginationSchema, paiseSchema, slugSchema } from './common';

const booleanFromQuery = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

/** Accepts "gold" or "gold,silver" (or repeated params) and normalises to an array. */
const finishListFromQuery = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.enum(FINISHES)).max(FINISHES.length));

/** Public listing filters. Prices are whole rupees in the URL for readability. */
export const productQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  finish: finishListFromQuery.optional(),
  minPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  inStock: booleanFromQuery.optional(),
  sort: z.enum(PRODUCT_SORTS).default('new'),
});
export type ProductQueryInput = z.input<typeof productQuerySchema>;
export type ProductQuery = z.output<typeof productQuerySchema>;

const urlSchema = z.url({ protocol: /^https?$/, error: 'Enter a valid http(s) URL' }).max(2048);
/** Media may be an absolute URL (UploadThing) or a site-relative placeholder path. */
const mediaUrlSchema = z.union([urlSchema, z.string().regex(/^\/[\w\-./]+$/, 'Invalid media path').max(512)]);

export const productImageSchema = z.strictObject({
  url: mediaUrlSchema,
  key: z.string().max(200).optional(),
  alt: z.string().trim().min(3, 'Describe the image for accessibility').max(160),
  sortOrder: z.number().int().min(0).max(100),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

export const productVideoSchema = z.strictObject({
  url: mediaUrlSchema,
  key: z.string().max(200).optional(),
  thumbnailUrl: mediaUrlSchema.optional(),
  thumbnailKey: z.string().max(200).optional(),
});
export type ProductVideoInput = z.infer<typeof productVideoSchema>;

/** Optional free text: an empty string clears the field (stored as null). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

const productFields = {
  name: z.string().trim().min(3, 'Name is too short').max(120),
  slug: slugSchema,
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, 'SKU: 3–40 characters, letters, numbers and hyphens'),
  description: z.string().trim().min(20, 'Write at least 20 characters').max(5000),
  type: z.enum(PRODUCT_TYPES),
  finish: z.enum(FINISHES),
  baseMaterial: optionalText(80),
  sizeOptions: z.array(z.string().trim().min(1).max(30)).max(20),
  careInstructions: optionalText(1000),
  pricePaise: paiseSchema.min(100, 'Price must be at least ₹1'),
  compareAtPricePaise: paiseSchema.nullable().optional(),
  stock: z.number().int().min(0).max(100_000),
  images: z.array(productImageSchema).max(12),
  videos: z.array(productVideoSchema).max(3),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  searchKeywords: z.array(z.string().trim().min(1).max(40)).max(20),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
};

const compareAtRule = <T extends { pricePaise?: number; compareAtPricePaise?: number | null }>(v: T) =>
  v.compareAtPricePaise == null || v.pricePaise == null || v.compareAtPricePaise > v.pricePaise;
const compareAtIssue = {
  path: ['compareAtPricePaise'],
  message: 'Compare-at price must be higher than the selling price',
};

export const createProductSchema = z
  .strictObject({
    ...productFields,
    slug: productFields.slug.optional(),
    sizeOptions: productFields.sizeOptions.default([]),
    images: productFields.images.default([]),
    videos: productFields.videos.default([]),
    status: productFields.status.default('draft'),
    featured: productFields.featured.default(false),
    searchKeywords: productFields.searchKeywords.default([]),
  })
  .refine(compareAtRule, compareAtIssue);
export type CreateProductInput = z.input<typeof createProductSchema>;

/** Stock is changed only through the dedicated stock endpoint, never via a general update. */
const { stock: _stock, ...updatableFields } = productFields;
export const updateProductSchema = z
  .strictObject(updatableFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })
  .refine(compareAtRule, compareAtIssue);
export type UpdateProductInput = z.input<typeof updateProductSchema>;

export const stockUpdateSchema = z.union([
  z.strictObject({ set: z.number().int().min(0).max(100_000), reason: z.string().trim().max(200).optional() }),
  z.strictObject({
    adjust: z.number().int().min(-100_000).max(100_000).refine((v) => v !== 0, 'Adjustment cannot be zero'),
    reason: z.string().trim().max(200).optional(),
  }),
]);
export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;

export const adminProductQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  type: z.enum(PRODUCT_TYPES).optional(),
  finish: z.enum(FINISHES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  lowStock: booleanFromQuery.optional(),
  sort: z.enum(['updated', 'name', 'stock', 'price']).default('updated'),
});

export const productIdParamSchema = z.object({ productId: objectIdSchema });
