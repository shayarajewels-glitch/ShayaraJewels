import {
  LOW_STOCK_THRESHOLD,
  type AdminProductDto,
  type ProductDetailDto,
  type ProductImageDto,
  type ProductSummaryDto,
} from '@shayara/shared';
import type { Product, ProductImage } from '../../models';

function sortedImages(images: ProductImage[]): ProductImageDto[] {
  return [...images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({ url: i.url, alt: i.alt, sortOrder: i.sortOrder }));
}

export function toProductSummary(p: Product): ProductSummaryDto {
  const images = sortedImages(p.images);
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    type: p.type,
    finish: p.finish,
    pricePaise: p.pricePaise,
    compareAtPricePaise: p.compareAtPricePaise ?? null,
    inStock: p.stock > 0,
    stockLeft: p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD ? p.stock : null,
    image: images[0] ?? null,
    hoverImage: images[1] ?? null,
    averageRating: Math.round(p.averageRating * 10) / 10,
    reviewCount: p.reviewCount,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toProductDetail(p: Product): ProductDetailDto {
  return {
    ...toProductSummary(p),
    sku: p.sku,
    description: p.description,
    baseMaterial: p.baseMaterial ?? null,
    sizeOptions: p.sizeOptions,
    careInstructions: p.careInstructions ?? null,
    images: sortedImages(p.images),
    videos: p.videos.map((v) => ({ url: v.url, thumbnailUrl: v.thumbnailUrl })),
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Admin view additionally exposes exact stock, status, file keys and keywords. */
export function toAdminProduct(p: Product): AdminProductDto {
  return {
    ...toProductDetail(p),
    images: [...p.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ url: i.url, key: i.key, alt: i.alt, sortOrder: i.sortOrder })),
    videos: p.videos.map((v) => ({ url: v.url, key: v.key, thumbnailUrl: v.thumbnailUrl, thumbnailKey: v.thumbnailKey })),
    status: p.status,
    stock: p.stock,
    unitsSold: p.unitsSold,
    searchKeywords: p.searchKeywords,
  };
}
