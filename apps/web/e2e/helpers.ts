import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@e2e.shayara.test', password: 'E2eAdminPass123' };
export const PASSWORD = 'Sparkle12345';

export const uniqueEmail = () => `shopper.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

export async function register(page: Page, email = uniqueEmail(), name = 'Meera Iyer') {
  await page.goto('/register', { waitUntil: 'networkidle' });
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account\/profile/);
  return email;
}

export async function login(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
