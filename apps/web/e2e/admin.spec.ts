import { expect, test } from '@playwright/test';
import { ADMIN, login } from './helpers';

test('admin creates, publishes and previews a product shown in the store', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password, '/admin/products/new');
  const sku = `PND-E2E-${Date.now().toString().slice(-6)}`;
  await page.getByLabel('Name', { exact: true }).fill('Tara Star Pendant');
  await page.getByLabel('SKU').fill(sku);
  await page.getByLabel('Description', { exact: true }).fill('A tiny star on a fine silver-tone chain, made for layering every day.');
  await page.getByLabel('Product type').selectOption('pendant');
  await page.getByLabel('Finish').selectOption('silver');
  await page.getByLabel('Base material').fill('Brass');
  await page.getByLabel('Price (₹)', { exact: true }).fill('749');
  await page.getByLabel('Opening stock').fill('12');
  await page.getByLabel('Add image by link or site path').fill('/images/products/pnd-chan-g-1.svg');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[a-f0-9]{24}$/);

  // Admin preview renders the shared customer component.
  await page.getByRole('link', { name: /Preview/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tara Star Pendant' })).toBeVisible();
  await expect(page.getByText('₹749').first()).toBeVisible();

  await page.goto('/products/tara-star-pendant');
  await expect(page.getByRole('heading', { level: 1, name: 'Tara Star Pendant' })).toBeVisible();
  // Admins see management controls on the customer page.
  await expect(page.getByText('You are viewing the customer page as an administrator')).toBeVisible();
});
