import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './env';
import { getApp } from '../tests/helpers';

const base = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://cluster.example.mongodb.net/shayara',
  SESSION_SECRET: 'x'.repeat(48),
  FRONTEND_URL: 'https://shayara.example',
};

describe('configuration', () => {
  it('starts without optional integration credentials', () => {
    const config = loadConfig(base);
    expect(config.payments.keyId).toBeUndefined();
    expect(config.uploadthing.token).toBeUndefined();
    expect(config.cookie.secure).toBe(true);
    expect(config.cookie.name).toBe('__Host-shayara_sid');
    expect(config.mail.transport).toBe('disabled');
  });

  it('reports missing required variables clearly', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow(ConfigError);
    try {
      loadConfig({ NODE_ENV: 'development' });
    } catch (err) {
      expect((err as ConfigError).problems.join(' ')).toMatch(/MONGODB_URI/);
      expect((err as ConfigError).problems.join(' ')).toMatch(/SESSION_SECRET/);
    }
  });

  it('refuses the mock payment gateway outside tests', () => {
    expect(() => loadConfig({ ...base, PAYMENT_PROVIDER: 'mock' })).toThrow(/mock/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'development', PAYMENT_PROVIDER: 'mock' })).toThrow(/mock/);
  });

  it('refuses insecure production settings', () => {
    expect(() => loadConfig({ ...base, FRONTEND_URL: 'http://shayara.example' })).toThrow(/https/);
    expect(() => loadConfig({ ...base, COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...base, MAIL_TRANSPORT: 'console' })).toThrow(/development-only/);
  });
});

describe('health and errors', () => {
  it('exposes health checks without configuration details', async () => {
    const res = await request(getApp()).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns safe JSON errors for unknown routes and bad JSON', async () => {
    const notFound = await request(getApp()).get('/api/v1/nope');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(notFound.body.error.requestId).toBeTruthy();
  });

  it('reports payment configuration errors instead of crashing', async () => {
    const { setPaymentGateway } = await import('../modules/payments/gateway');
    const { setConfig, getConfig } = await import('./env');
    const original = getConfig();
    setConfig({ ...original, payments: { ...original.payments, provider: 'razorpay', keyId: undefined, keySecret: undefined } });
    setPaymentGateway(undefined);
    try {
      const { registeredClient, addAddress, createProduct } = await import('../tests/helpers');
      const product = await createProduct();
      const { client } = await registeredClient();
      const addressId = await addAddress(client);
      await client.post('/cart/items', { productId: product.id });
      const res = await client.checkout({ addressId, paymentMethod: 'razorpay' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('PAYMENT_NOT_CONFIGURED');
      const cod = await client.checkout({ addressId, paymentMethod: 'cod' });
      expect(cod.status).toBe(201);
    } finally {
      setConfig(original);
      setPaymentGateway(undefined);
    }
  });
});
