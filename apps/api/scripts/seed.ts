/**
 * Adds the sample catalogue (development / demo). Idempotent: products whose
 * SKU already exists are kept, except that their old SVG placeholder images
 * are swapped for the sample photos. Never deletes anything.
 *
 *   npm run seed
 *
 * Refuses to run with NODE_ENV=production unless --allow-production is given.
 */
import { parseArgs } from 'node:util';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { getConfig } from '../src/config/env';
import { SEED_PRODUCTS } from './catalogue-data';
import { clearLegacySeoDefaults, replacePlaceholderImages, seedCatalogue } from './seed-lib';

async function main() {
  const { values } = parseArgs({ options: { 'allow-production': { type: 'boolean', default: false } } });
  const config = getConfig();
  if (config.isProduction && !values['allow-production']) {
    throw new Error('Refusing to seed sample products into a production database. Pass --allow-production if you really mean it.');
  }
  await connectDatabase(config.mongodbUri);
  try {
    const created = await seedCatalogue();
    const photos = await replacePlaceholderImages();
    const seo = await clearLegacySeoDefaults();
    console.log(
      `Seed complete: ${created} product(s) added, ${SEED_PRODUCTS.length - created} already present, ${photos} switched to photos, ${seo} given generated SEO text.`,
    );
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(`seed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
