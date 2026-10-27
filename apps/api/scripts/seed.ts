/**
 * Adds the sample catalogue (development / demo). Idempotent: products whose
 * SKU already exists are left untouched. Never deletes anything.
 *
 *   npm run seed
 *
 * Refuses to run with NODE_ENV=production unless --allow-production is given.
 */
import { parseArgs } from 'node:util';
import { FINISH_LABELS, slugify } from '@shayara/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { getConfig } from '../src/config/env';
import { ProductModel } from '../src/models';
import { CARE_INSTRUCTIONS, SEED_PRODUCTS } from './catalogue-data';

export const imagePathFor = (sku: string, n: 1 | 2) => `/images/products/${sku.toLowerCase()}-${n}.svg`;

async function main() {
  const { values } = parseArgs({ options: { 'allow-production': { type: 'boolean', default: false } } });
  const config = getConfig();
  if (config.isProduction && !values['allow-production']) {
    throw new Error('Refusing to seed sample products into a production database. Pass --allow-production if you really mean it.');
  }
  await connectDatabase(config.mongodbUri);
  let created = 0;
  try {
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
    console.log(`Seed complete: ${created} product(s) added, ${SEED_PRODUCTS.length - created} already present.`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(`seed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
