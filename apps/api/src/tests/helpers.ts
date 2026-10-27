import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { CSRF_HEADER, IDEMPOTENCY_HEADER, type CreateProductInput } from '@shayara/shared';
import { createApp } from '../app';
import { ProductModel, UserModel } from '../models';
import { hashPassword } from '../modules/auth/password';

let app: Express | undefined;
export function getApp(): Express {
  app ??= createApp();
  return app;
}

export const ORIGIN = 'http://localhost:3000';
export const PASSWORD = 'Sparkle12345';

/** A browser-like client: keeps cookies and sends the CSRF token on unsafe requests. */
export class Client {
  readonly agent: TestAgent;
  csrf = '';

  constructor(appInstance: Express = getApp()) {
    this.agent = request.agent(appInstance);
  }

  async init() {
    const res = await this.agent.get('/api/v1/auth/me').set('Origin', ORIGIN);
    this.csrf = res.body.csrfToken;
    return res;
  }

  get(path: string) {
    return this.agent.get(`/api/v1${path}`).set('Origin', ORIGIN);
  }

  private unsafe(method: 'post' | 'patch' | 'delete', path: string, body?: object, headers: Record<string, string> = {}) {
    const req = this.agent[method](`/api/v1${path}`).set('Origin', ORIGIN).set(CSRF_HEADER, this.csrf);
    for (const [k, v] of Object.entries(headers)) req.set(k, v);
    return body ? req.send(body) : req;
  }

  async post(path: string, body?: object, headers?: Record<string, string>) {
    const res = await this.unsafe('post', path, body, headers);
    if (res.body?.csrfToken) this.csrf = res.body.csrfToken;
    return res;
  }

  patch(path: string, body?: object) {
    return this.unsafe('patch', path, body);
  }

  delete(path: string) {
    return this.unsafe('delete', path);
  }

  checkout(body: object, key = randomUUID()) {
    return this.unsafe('post', '/checkout', body, { [IDEMPOTENCY_HEADER]: key });
  }
}

let counter = 0;
export const uniqueEmail = () => `user${Date.now()}${counter++}@example.com`;

export async function registeredClient(overrides: { name?: string; email?: string } = {}) {
  const client = new Client();
  await client.init();
  const email = overrides.email ?? uniqueEmail();
  const res = await client.post('/auth/register', {
    name: overrides.name ?? 'Ananya Sharma',
    email,
    password: PASSWORD,
    acceptTerms: true,
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { client, user: res.body.user as { id: string; email: string }, email };
}

/** Admins can only be created out-of-band (seed script / direct DB), exactly like production. */
export async function adminClient() {
  const email = uniqueEmail();
  await UserModel.create({ name: 'Store Admin', email, passwordHash: await hashPassword(PASSWORD), role: 'admin', emailVerified: true });
  const client = new Client();
  await client.init();
  const res = await client.post('/auth/login', { email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`admin login failed: ${res.status}`);
  return client;
}

let sku = 0;
export async function createProduct(overrides: Partial<CreateProductInput> & { stock?: number; unitsSold?: number; averageRating?: number; reviewCount?: number; ratingScore?: number } = {}) {
  const n = sku++;
  return ProductModel.create({
    name: `Test Ring ${n}`,
    slug: `test-ring-${n}-${randomUUID().slice(0, 6)}`,
    sku: `TST-${n}-${randomUUID().slice(0, 4).toUpperCase()}`,
    description: 'A delicate test ring with a gold-tone finish over brass.',
    type: 'ring',
    finish: 'gold',
    baseMaterial: 'Brass',
    pricePaise: 99_900,
    stock: 10,
    images: [{ url: '/images/products/placeholder.svg', alt: 'Test ring', sortOrder: 0 }],
    status: 'published',
    ...overrides,
  });
}

export async function addAddress(client: Client) {
  const res = await client.post('/users/me/addresses', {
    fullName: 'Ananya Sharma',
    phone: '9876543210',
    addressLine1: '12 MG Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
  });
  if (res.status !== 201) throw new Error(`address failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

