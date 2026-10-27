import { FINISH_LABELS, slugify } from '@shayara/shared';
import { ProductModel } from '../src/models';
import { CARE_INSTRUCTIONS, SEED_PRODUCTS } from './catalogue-data';

const imagePathFor = (sku: string, n: 1 | 2) => `/images/products/${sku.toLowerCase()}-${n}.svg`;

/** Inserts sample products whose SKU is not present yet. Returns how many were added. Never deletes. */
export async function seedCatalogue(): Promise<number> {
  let created = 0;
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    if (await ProductModel.exists({ sku: p.sku })) continue;
    const finish = FINISH_LABELS[p.finish].toLowerCase();
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
      images: [
        { url: imagePathFor(p.sku, 1), alt: `${p.name} in ${finish} on an ivory background`, sortOrder: 0 },
        { url: imagePathFor(p.sku, 2), alt: `Close-up detail of the ${p.name}`, sortOrder: 1 },
      ],
      status: 'published',
      publishedAt: new Date(),
      featured: p.featured ?? false,
      searchKeywords: p.keywords,
      seoTitle: `${p.name} — ${FINISH_LABELS[p.finish]} ${p.type}`.slice(0, 70),
      seoDescription: p.description.slice(0, 160),
      // Stagger createdAt so "new arrivals" has a stable order.
      createdAt: new Date(Date.now() - (SEED_PRODUCTS.length - i) * 60_000),
    });
    created++;
  }
  return created;
}
