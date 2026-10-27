import type { QueryFilter, SortOrder } from 'mongoose';
import { CATEGORIES, type CategoryDto, type ProductQuery, type ProductSort } from '@shayara/shared';
import { ProductModel, type Product } from '../../models';
import { notFound } from '../../utils/errors';
import { escapeRegex, paginate } from '../../utils/http';
import { toProductDetail, toProductSummary } from './product.mappers';

const PUBLISHED = { status: 'published' } as const;

export const SORTS: Record<ProductSort, Record<string, SortOrder>> = {
  new: { createdAt: -1, _id: -1 },
  bestsellers: { unitsSold: -1, featured: -1, createdAt: -1 },
  'top-rated': { ratingScore: -1, reviewCount: -1, createdAt: -1 },
  'price-asc': { pricePaise: 1, _id: 1 },
  'price-desc': { pricePaise: -1, _id: -1 },
};

function baseFilter(query: ProductQuery): QueryFilter<Product> {
  const filter: QueryFilter<Product> = { ...PUBLISHED };
  if (query.type) filter.type = query.type;
  if (query.finish?.length) filter.finish = { $in: query.finish };
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.pricePaise = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice * 100 } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice * 100 } : {}),
    };
  }
  if (query.inStock) filter.stock = { $gt: 0 };
  return filter;
}

/**
 * Server-side filtered, sorted and paginated listing. Search uses the
 * weighted text index; if that finds nothing (e.g. a partial word such as
 * "brace"), it falls back to a case-insensitive prefix match.
 */
export async function listProducts(query: ProductQuery) {
  const filter = baseFilter(query);
  const sort = SORTS[query.sort];
  const skip = (query.page - 1) * query.limit;

  const run = async (f: QueryFilter<Product>) => {
    const [docs, total] = await Promise.all([
      ProductModel.find(f).sort(sort).skip(skip).limit(query.limit).lean<Product[]>(),
      ProductModel.countDocuments(f),
    ]);
    return { docs, total };
  };

  let result: { docs: Product[]; total: number };
  if (query.q) {
    result = await run({ ...filter, $text: { $search: query.q } });
    if (result.total === 0) {
      const pattern = new RegExp(`\\b${escapeRegex(query.q)}`, 'i');
      result = await run({
        ...filter,
        $or: [{ name: pattern }, { searchKeywords: pattern }, { type: pattern }, { finish: pattern }, { description: pattern }],
      });
    }
  } else {
    result = await run(filter);
  }
  return paginate(result.docs.map(toProductSummary), result.total, query.page, query.limit);
}

export async function getPublishedProductBySlug(slug: string) {
  const product = await ProductModel.findOne({ slug, ...PUBLISHED }).lean<Product>();
  if (!product) throw notFound('Product not found');
  return toProductDetail(product);
}

export async function relatedProducts(slug: string, limit = 4) {
  const product = await ProductModel.findOne({ slug, ...PUBLISHED }).select('type finish').lean<Product>();
  if (!product) throw notFound('Product not found');
  const sameType = await ProductModel.find({ ...PUBLISHED, type: product.type, _id: { $ne: product._id } })
    .sort({ stock: -1, unitsSold: -1, createdAt: -1 })
    .limit(limit)
    .lean<Product[]>();
  let docs = sameType;
  if (docs.length < limit) {
    const more = await ProductModel.find({
      ...PUBLISHED,
      finish: product.finish,
      _id: { $nin: [product._id, ...docs.map((d) => d._id)] },
    })
      .sort({ unitsSold: -1, createdAt: -1 })
      .limit(limit - docs.length)
      .lean<Product[]>();
    docs = [...docs, ...more];
  }
  return docs.map(toProductSummary);
}

export type CollectionName = 'featured' | 'bestsellers' | 'new-arrivals' | 'top-rated';

/**
 * Curated collections. `fallback` is true when there is not enough real
 * sales or review data and featured products were returned instead, so the
 * storefront can label the rail honestly.
 */
export async function getCollection(name: CollectionName, limit = 8) {
  const find = (filter: QueryFilter<Product>, sort: Record<string, SortOrder>) =>
    ProductModel.find({ ...PUBLISHED, ...filter }).sort(sort).limit(limit).lean<Product[]>();

  let docs: Product[] = [];
  let fallback = false;
  switch (name) {
    case 'featured':
      docs = await find({ featured: true }, { createdAt: -1 });
      if (docs.length < limit) {
        const extra = await find({ _id: { $nin: docs.map((d) => d._id) } }, SORTS.new);
        docs = [...docs, ...extra].slice(0, limit);
      }
      break;
    case 'new-arrivals':
      docs = await find({}, SORTS.new);
      break;
    case 'bestsellers':
      docs = await find({ unitsSold: { $gt: 0 } }, SORTS.bestsellers);
      break;
    case 'top-rated':
      docs = await find({ ratingScore: { $gt: 0 } }, SORTS['top-rated']);
      break;
  }
  if (docs.length === 0 && (name === 'bestsellers' || name === 'top-rated')) {
    fallback = true;
    docs = await find({ featured: true }, { createdAt: -1 });
  }
  return { items: docs.map(toProductSummary), fallback };
}

export async function listCategories(): Promise<CategoryDto[]> {
  const counts = await ProductModel.aggregate<{ _id: string; count: number }>([
    { $match: PUBLISHED },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const byType = new Map(counts.map((c) => [c._id, c.count]));
  return CATEGORIES.map((c) => ({ ...c, productCount: byType.get(c.type) ?? 0 }));
}

/** Slugs and timestamps for the sitemap. Published products only. */
export async function listPublishedSlugs() {
  return ProductModel.find(PUBLISHED).select('slug updatedAt').sort({ updatedAt: -1 }).limit(50_000).lean<Pick<Product, 'slug' | 'updatedAt'>[]>();
}
