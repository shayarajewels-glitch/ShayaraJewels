import { CATEGORIES, type AdminCategoryImageDto, type CategoryImageInput, type ProductType } from '@shayara/shared';
import { notifyCatalogueChanged } from '../../lib/storefront-cache';
import { CategoryImageModel, MediaAssetModel, type CategoryImage } from '../../models';
import { assertAllowedMediaUrl, releaseMedia } from '../uploads/media.service';

/** Custom tile pictures by product type, for the public category list. */
export async function categoryImagesByType(): Promise<Map<ProductType, { url: string; alt: string }>> {
  const docs = await CategoryImageModel.find().lean<CategoryImage[]>();
  return new Map(docs.map((d) => [d.type, { url: d.url, alt: d.alt }]));
}

export async function adminListCategoryImages(): Promise<AdminCategoryImageDto[]> {
  const docs = await CategoryImageModel.find().lean<CategoryImage[]>();
  return CATEGORIES.map((c) => {
    const doc = docs.find((d) => d.type === c.type);
    return {
      type: c.type,
      slug: c.slug,
      name: c.name,
      image: doc ? { url: doc.url, key: doc.key, alt: doc.alt } : null,
      updatedAt: doc ? doc.updatedAt.toISOString() : null,
    };
  });
}

/** Sets (or with null, clears) a category's picture. A replaced uploaded file is deleted from UploadThing. */
export async function adminSetCategoryImage(type: ProductType, { image }: CategoryImageInput): Promise<AdminCategoryImageDto[]> {
  const previous = await CategoryImageModel.findOne({ type }).lean<CategoryImage>();
  if (image) {
    assertAllowedMediaUrl(image.url, 'image.url', { anyHost: !image.key });
    const name = CATEGORIES.find((c) => c.type === type)!.name;
    await CategoryImageModel.updateOne(
      { type },
      { $set: { url: image.url, key: image.key ?? null, alt: image.alt || `${name} from Shayara` } },
      { upsert: true },
    );
    // Uploaded pictures are kept out of the orphan-media cleanup.
    if (image.key) await MediaAssetModel.updateMany({ key: image.key, status: 'pending' }, { status: 'attached' });
  } else {
    await CategoryImageModel.deleteOne({ type });
  }
  const newKey = image?.key ?? null;
  if (previous?.key && previous.key !== newKey) await releaseMedia([previous.key]);
  notifyCatalogueChanged();
  return adminListCategoryImages();
}
