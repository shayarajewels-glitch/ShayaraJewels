import { FINISH_LABELS, slugify } from '@shayara/shared';
import { ProductModel } from '../src/models';
import { CARE_INSTRUCTIONS, SEED_PRODUCTS } from './catalogue-data';

/** Free Unsplash-licensed photos in apps/web/public/images/products (credits in docs/image-credits.md). */
const imagePathFor = (sku: string, n: 1 | 2) => `/images/products/${sku.toLowerCase()}-${n}.jpg`;
const placeholderPathFor = (sku: string, n: 1 | 2) => `/images/products/${sku.toLowerCase()}-${n}.svg`;

function sampleImages(p: (typeof SEED_PRODUCTS)[number]) {
  const finish = FINISH_LABELS[p.finish].toLowerCase();
  const images = [{ url: imagePathFor(p.sku, 1), alt: `${p.name} in ${finish}`, sortOrder: 0 }];
  if ((p.photos ?? 2) === 2) images.push({ url: imagePathFor(p.sku, 2), alt: `${p.name} in ${finish}, styled`, sortOrder: 1 });
  return images;
}

/**
 * Swaps the old SVG illustrations for the sample photos on existing sample
 * products. Products whose images were changed in the admin are left alone.
 * Returns how many products were updated.
 */
export async function replacePlaceholderImages(): Promise<number> {
  let updated = 0;
  for (const p of SEED_PRODUCTS) {
    const placeholders = [placeholderPathFor(p.sku, 1), placeholderPathFor(p.sku, 2)];
    const res = await ProductModel.updateOne(
      { sku: p.sku, 'images.url': { $all: placeholders }, images: { $size: 2 } },
      { $set: { images: sampleImages(p) } },
    );
    updated += res.modifiedCount;
  }
  return updated;
}

/**
 * Clears the SEO title/description that older seeds copied onto sample
 * products, so the storefront's generated defaults apply. Values edited in
 * the admin no longer match the old pattern and are kept. Returns how many
 * products were updated.
 */
export async function clearLegacySeoDefaults(): Promise<number> {
  let updated = 0;
  for (const p of SEED_PRODUCTS) {
    const res = await ProductModel.updateOne(
      { sku: p.sku, seoTitle: `${p.name} — ${FINISH_LABELS[p.finish]} ${p.type}`.slice(0, 70), seoDescription: p.description.slice(0, 160) },
      { $unset: { seoTitle: 1, seoDescription: 1 } },
    );
    updated += res.modifiedCount;
  }
  return updated;
}

/** Inserts sample products whose SKU is not present yet. Returns how many were added. Never deletes. */
export async function seedCatalogue(): Promise<number> {
  let created = 0;
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    if (await ProductModel.exists({ sku: p.sku })) continue;
    await ProductModel.create({
      name: p.name,
      slug: slugify(`${p.name} ${p.finish}`),
      sku: p.sku,
      description: p.description,
      type: p.type,
      finish: p.finish,
      baseMaterial: p.baseMaterial,
      sizeOptions: p.sizeOptions ?? [],
      careInstructions: CARE_INSTRUCTIONS,
      pricePaise: p.pricePaise,
      stock: p.stock,
      images: sampleImages(p),
      status: 'published',
      publishedAt: new Date(),
      featured: p.featured ?? false,
      searchKeywords: p.keywords,
      // No seoTitle/seoDescription: the storefront generates keyword-rich defaults (productSeoTitle).
      // Stagger createdAt so "new arrivals" has a stable order.
      createdAt: new Date(Date.now() - (SEED_PRODUCTS.length - i) * 60_000),
    });
    created++;
  }
  return created;
}
