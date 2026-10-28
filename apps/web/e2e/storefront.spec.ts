import { expect, test } from '@playwright/test';

test('homepage presents the brand and collections @mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Everyday elegance');
  await expect(page.getByRole('heading', { name: 'Shop by category' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('filters and sorting live in the URL', async ({ page }) => {
  await page.goto('/categories/rings', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Rings' })).toBeVisible();
  await page.getByRole('complementary', { name: 'Filters' }).getByLabel('Silver tone').check();
  await expect(page).toHaveURL(/finish=silver/);
  await page.getByLabel('Sort by').selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);
  const names = await page.locator('article h3').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n).toContain('Mira');
  // Shareable: reloading the URL keeps the same results.
  await page.reload();
  await expect(page.locator('article h3')).toHaveCount(names.length);
});

test('search finds products by keyword', async ({ page }) => {
  await page.goto('/');
  // Desktop shows the search field in the header; smaller screens open it from the Search button.
  await page.getByRole('searchbox', { name: 'Search jewellery' }).fill('crescent');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=crescent/);
  await expect(page.getByRole('heading', { name: 'Chandni Crescent Pendant' })).toBeVisible();
});

test('product page has metadata, structured data and gallery', async ({ page }) => {
  await page.goto('/products/zoya-pearl-choker-gold');
  await expect(page).toHaveTitle(/Zoya Pearl Choker/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/products\/zoya-pearl-choker-gold$/);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = ld.map((s) => JSON.parse(s)).find((j) => j['@type'] === 'Product');
  expect(product.offers.price).toBe('1299.00');
  expect(product.offers.availability).toBe('https://schema.org/InStock');
  expect(product.aggregateRating).toBeUndefined();
  await page.getByRole('button', { name: /Show photo 2/ }).click();
  await expect(page.getByText('This is fashion jewellery')).toBeAttached();
});

test('unknown products return 404', async ({ page }) => {
  const res = await page.goto('/products/does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('This piece has wandered off')).toBeVisible();
});

test('private pages redirect to login and are not indexable', async ({ page }) => {
  const res = await page.goto('/account/orders');
  expect(res?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders/);
});
