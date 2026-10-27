import { expect, test } from '@playwright/test';
import { ADMIN, login, register } from './helpers';

/**
 * Full happy path: guest cart → account → address → COD order → admin fulfils
 * it → customer reviews → admin approves → review is public.
 */
test('customer orders, admin fulfils, verified review is published', async ({ browser }) => {
  const customer = await browser.newPage();

  // Guest adds to bag; the bag survives registration.
  await customer.goto('/products/aria-layered-necklace-gold', { waitUntil: 'networkidle' });
  await customer.getByRole('button', { name: 'Add to bag' }).click();
  await expect(customer.getByRole('dialog', { name: 'Your bag' })).toBeVisible();
  await customer.keyboard.press('Escape');
  await register(customer);
  await customer.goto('/cart');
  await expect(customer.getByRole('link', { name: 'Aria Layered Necklace', exact: true })).toBeVisible();

  // Checkout with a new address and Cash on Delivery.
  await customer.goto('/checkout');
  await customer.getByLabel('Full name').fill('Meera Iyer');
  await customer.getByLabel('Mobile number').fill('9876501234');
  await customer.getByLabel('Flat, house no., building, street').fill('Flat 4B, Lotus Residency');
  await customer.getByLabel('City').fill('Chennai');
  await customer.getByLabel('State / UT').selectOption('Tamil Nadu');
  await customer.getByLabel('PIN code').fill('600017');
  await customer.getByRole('button', { name: 'Save address' }).click();
  await customer.getByLabel(/Cash on Delivery/).check();
  // ₹1,499 + free shipping (≥ ₹999) + ₹49 COD fee, computed by the server.
  await expect(customer.getByText('₹1,548').first()).toBeVisible();
  await customer.getByRole('button', { name: 'Place order' }).click();
  await expect(customer).toHaveURL(/\/account\/orders\/SHY-/);
  await expect(customer.getByText('Thank you for your order!')).toBeVisible();
  const orderNumber = (await customer.getByRole('heading', { level: 1 }).textContent())!.replace('Order ', '').trim();

  // Admin ships and delivers it.
  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password, '/admin/orders');
  await admin.getByRole('link', { name: orderNumber }).first().click();
  await admin.getByLabel('Move order to').selectOption('shipped');
  await admin.getByLabel('Courier').fill('Delhivery');
  await admin.getByLabel('Tracking number').fill('DL1234567890');
  await admin.getByRole('button', { name: 'Update status' }).click();
  await expect(admin.getByText('Delhivery').first()).toBeVisible();
  await admin.getByLabel('Move order to').selectOption('delivered');
  await admin.getByLabel(/Cash was collected/).check();
  await admin.getByRole('button', { name: 'Update status' }).click();
  await expect(admin.getByText('Delivered').first()).toBeVisible();

  // Customer sees tracking and reviews the delivered item.
  await customer.reload();
  await expect(customer.getByText('DL1234567890')).toBeVisible();
  await customer.getByRole('button', { name: 'Write a review' }).click();
  await customer.getByRole('radio', { name: '5 stars' }).click();
  await customer.getByLabel('Title').fill('Wear it every day');
  await customer.getByLabel('Your review').fill('Light, pretty and the layers do not tangle. Lovely gift box too.');
  await customer.getByRole('button', { name: 'Submit review' }).click();
  await expect(customer.getByText(/will appear once approved/)).toBeVisible();

  // Admin approves; the review becomes public with a verified badge.
  await admin.goto('/admin/reviews');
  await expect(admin.getByText('Wear it every day')).toBeVisible();
  await admin.getByRole('button', { name: 'Approve' }).first().click();
  await expect(admin.getByText('Wear it every day')).toBeHidden();

  await expect
    .poll(async () => {
      await customer.goto('/products/aria-layered-necklace-gold', { waitUntil: 'networkidle' });
      return customer.getByText('Wear it every day').count();
    }, { timeout: 30_000, intervals: [2_000] })
    .toBeGreaterThan(0);
  await expect(customer.getByText('Verified purchase').first()).toBeVisible();
});

test('customers cannot open the admin dashboard', async ({ page }) => {
  await register(page);
  await page.goto('/admin');
  await expect(page.getByText(/not authori[sz]ed/i)).toBeVisible();
});
