import type { QueryFilter, SortOrder, Types } from 'mongoose';
import {
  LOW_STOCK_THRESHOLD,
  slugify,
  type CreateProductInput,
  type StockUpdateInput,
  type UpdateProductInput,
  type adminProductQuerySchema,
  type createProductSchema,
  type updateProductSchema,
} from '@shayara/shared';
import type { z } from 'zod';
import { isDuplicateKeyError } from '../../config/db';
import { InventoryAdjustmentModel, OrderModel, ProductModel, type Product } from '../../models';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { escapeRegex, paginate } from '../../utils/http';
import { assertKeysAttachable, collectKeys, markAttached, releaseMedia, validateMediaUrls } from '../uploads/media.service';
import { toAdminProduct } from '../products/product.mappers';

type AdminProductQuery = z.output<typeof adminProductQuerySchema>;
type CreateProduct = z.output<typeof createProductSchema>;
type UpdateProduct = z.output<typeof updateProductSchema>;
export type { CreateProductInput, UpdateProductInput };

const ADMIN_SORTS: Record<AdminProductQuery['sort'], Record<string, SortOrder>> = {
  updated: { updatedAt: -1 },
  name: { name: 1 },
  stock: { stock: 1, name: 1 },
  price: { pricePaise: 1 },
};

export async function adminListProducts(q: AdminProductQuery) {
  const filter: QueryFilter<Product> = {};
  if (q.type) filter.type = q.type;
  if (q.finish) filter.finish = q.finish;
  if (q.status) filter.status = q.status;
  else filter.status = { $ne: 'archived' };
  if (q.lowStock) filter.stock = { $lte: LOW_STOCK_THRESHOLD };
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: re }, { sku: re }, { slug: re }];
  }
  const [docs, total] = await Promise.all([
    ProductModel.find(filter).sort(ADMIN_SORTS[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).lean<Product[]>(),
    ProductModel.countDocuments(filter),
  ]);
  return paginate(docs.map(toAdminProduct), total, q.page, q.limit);
}

export async function adminGetProduct(id: string) {
  const product = await ProductModel.findById(id).lean<Product>();
  if (!product) throw notFound('Product not found');
  return toAdminProduct(product);
}

async function uniqueSlug(base: string, excludeId?: Types.ObjectId): Promise<string> {
  const root = slugify(base) || 'product';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await ProductModel.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!clash) return candidate;
  }
  throw conflict('Could not generate a unique slug; please set one manually');
}

function assertPublishable(p: Pick<Product, 'status' | 'images'>): void {
  if (p.status === 'published' && p.images.length === 0) {
    throw badRequest('Add at least one image before publishing', 'VALIDATION_ERROR', [
      { path: 'images', message: 'A published product needs at least one image' },
    ]);
  }
}

function normaliseImages<T extends { sortOrder: number }>(images: T[]): T[] {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder).map((img, i) => ({ ...img, sortOrder: i }));
}

function mapDuplicate(err: unknown): never {
  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0];
    if (field === 'sku') throw conflict('Another product already uses this SKU', 'SKU_TAKEN');
    if (field === 'slug') throw conflict('Another product already uses this slug', 'SLUG_TAKEN');
  }
  throw err;
}

export async function adminCreateProduct(input: CreateProduct) {
  validateMediaUrls(input);
  const keys = collectKeys(input);
  await assertKeysAttachable(keys, null);
  const images = normaliseImages(input.images);
  assertPublishable({ status: input.status, images: images as Product['images'] });

  const slug = input.slug ? input.slug : await uniqueSlug(input.name);
  try {
    const product = await ProductModel.create({
      ...input,
      slug,
      images,
      publishedAt: input.status === 'published' ? new Date() : null,
    });
    await markAttached(keys, product._id);
    return toAdminProduct(product.toObject());
  } catch (err) {
    mapDuplicate(err);
  }
}

export async function adminUpdateProduct(id: string, input: UpdateProduct) {
  const product = await ProductModel.findById(id);
  if (!product) throw notFound('Product not found');

  validateMediaUrls(input);
  const previousKeys = collectKeys(product.toObject());
  const next = {
    images: input.images ? normaliseImages(input.images) : product.images,
    videos: input.videos ?? product.videos,
  };
  const nextKeys = collectKeys(next as Parameters<typeof collectKeys>[0]);
  const addedKeys = nextKeys.filter((k) => !previousKeys.includes(k));
  await assertKeysAttachable(addedKeys, product._id);

  // `input` is already restricted by a strict schema (no stock, ratings, sales or timestamps).
  const { images: _i, videos: _v, ...fields } = input;
  product.set(Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)));
  if (input.compareAtPricePaise === null) product.compareAtPricePaise = null;
  if (input.images) product.images = next.images as Product['images'];
  if (input.videos) product.videos = next.videos as Product['videos'];
  if (input.status === 'published' && !product.publishedAt) product.publishedAt = new Date();
  assertPublishable(product);

  if (product.compareAtPricePaise != null && product.compareAtPricePaise <= product.pricePaise) {
    throw badRequest('Compare-at price must be higher than the selling price', 'VALIDATION_ERROR', [
      { path: 'compareAtPricePaise', message: 'Must be higher than the selling price' },
    ]);
  }

  try {
    await product.save();
  } catch (err) {
    mapDuplicate(err);
  }
  await markAttached(addedKeys, product._id);
  const removedKeys = previousKeys.filter((k) => !nextKeys.includes(k));
  await releaseMedia(removedKeys, product._id);
  return toAdminProduct(product.toObject());
}

/**
 * Products that appear in orders are archived (orders keep their snapshots and
 * images). Products that were never ordered are deleted with their media.
 */
export async function adminDeleteProduct(id: string): Promise<{ result: 'archived' | 'deleted' }> {
  const product = await ProductModel.findById(id);
  if (!product) throw notFound('Product not found');
  const ordered = await OrderModel.exists({ 'items.productId': product._id });
  if (ordered) {
    product.status = 'archived';
    product.featured = false;
    await product.save();
    return { result: 'archived' };
  }
  const keys = collectKeys(product.toObject());
  await product.deleteOne();
  await releaseMedia(keys);
  return { result: 'deleted' };
}

/** Atomic stock change. Adjustments can never take stock below zero. */
export async function adminUpdateStock(id: string, input: StockUpdateInput, adminId: Types.ObjectId) {
  let updated: Product | null;
  let delta: number;
  if ('set' in input) {
    const before = await ProductModel.findByIdAndUpdate(id, { $set: { stock: input.set } }).lean<Product>();
    if (!before) throw notFound('Product not found');
    delta = input.set - before.stock;
    updated = { ...before, stock: input.set };
  } else {
    delta = input.adjust;
    updated = await ProductModel.findOneAndUpdate(
      { _id: id, ...(input.adjust < 0 ? { stock: { $gte: -input.adjust } } : {}) },
      { $inc: { stock: input.adjust } },
      { returnDocument: 'after' },
    ).lean<Product>();
    if (!updated) {
      const exists = await ProductModel.exists({ _id: id });
      if (!exists) throw notFound('Product not found');
      throw badRequest('Stock cannot go below zero', 'INSUFFICIENT_STOCK');
    }
  }
  await InventoryAdjustmentModel.create({
    productId: updated._id,
    delta,
    resultingStock: updated.stock,
    reason: input.reason ?? null,
    adminId,
  });
  return toAdminProduct(updated);
}
