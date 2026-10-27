import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CSRF_HEADER } from '@shayara/shared';
import { getMailer, type MemoryMailer } from '../../lib/mailer';
import { SessionModel, UserModel } from '../../models';
import { Client, ORIGIN, PASSWORD, getApp, registeredClient, uniqueEmail } from '../../tests/helpers';

const cookieOf = (res: request.Response) => {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('shayara_sid=')) ?? '';
};

describe('registration and login', () => {
  it('registers a customer, hashes the password with Argon2id and starts a session', async () => {
    const { client, email } = await registeredClient();
    const user = await UserModel.findOne({ email }).select('+passwordHash').lean();
    expect(user?.role).toBe('customer');
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user?.passwordHash).not.toContain(PASSWORD);

    const me = await client.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    expect(me.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects attempts to self-assign a role (mass assignment)', async () => {
    const client = new Client();
    await client.init();
    const res = await client.post('/auth/register', {
      name: 'Mallory',
      email: uniqueEmail(),
      password: PASSWORD,
      acceptTerms: true,
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await UserModel.countDocuments({ role: 'admin' })).toBe(0);
  });

  it('rejects duplicate emails regardless of case', async () => {
    const { email } = await registeredClient();
    const client = new Client();
    await client.init();
    const res = await client.post('/auth/register', { name: 'Twin', email: email.toUpperCase(), password: PASSWORD, acceptTerms: true });
    expect(res.status).toBe(409);
  });

  it('validates password strength', async () => {
    const client = new Client();
    await client.init();
    const res = await client.post('/auth/register', { name: 'Weak', email: uniqueEmail(), password: 'short', acceptTerms: true });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { path: string }) => d.path === 'password')).toBe(true);
  });

  it('uses the same error for unknown email and wrong password', async () => {
    const { email } = await registeredClient();
    const client = new Client();
    await client.init();
    const wrong = await client.post('/auth/login', { email, password: 'Wrong123456' });
    const unknown = await client.post('/auth/login', { email: uniqueEmail(), password: 'Wrong123456' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('rotates the session id on login and sets a secure-by-default HttpOnly cookie', async () => {
    const { email } = await registeredClient();
    const client = new Client();
    const first = await client.init();
    const before = cookieOf(first);
    expect(before).toMatch(/HttpOnly/i);
    expect(before).toMatch(/SameSite=Lax/i);

    const login = await client.post('/auth/login', { email, password: PASSWORD });
    expect(login.status).toBe(200);
    const after = cookieOf(login);
    expect(after.split(';')[0]).not.toBe(before.split(';')[0]);
    // The anonymous session was deleted, not upgraded in place.
    expect(await SessionModel.countDocuments({ userId: null })).toBe(0);
  });

  it('stores only a hash of the session token', async () => {
    const client = new Client();
    const res = await client.init();
    const token = cookieOf(res).split(';')[0]!.split('=')[1]!;
    expect(await SessionModel.countDocuments({ tokenHash: token })).toBe(0);
    expect(await SessionModel.countDocuments()).toBe(1);
  });

  it('invalidates the session on logout', async () => {
    const { client } = await registeredClient();
    const res = await client.post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    const me = await client.get('/auth/me');
    expect(me.body.user).toBeNull();
    expect(await SessionModel.countDocuments({ userId: { $ne: null } })).toBe(0);
  });

  it('logs out every device when the password changes', async () => {
    const { client, email } = await registeredClient();
    const other = new Client();
    await other.init();
    await other.post('/auth/login', { email, password: PASSWORD });

    const res = await client.patch('/users/me', { currentPassword: PASSWORD, newPassword: 'NewSparkle456' });
    expect(res.status).toBe(200);
    client.csrf = res.body.csrfToken;
    expect((await other.get('/auth/me')).body.user).toBeNull();
    expect((await client.get('/auth/me')).body.user.email).toBe(email);
  });

  it('refuses to change the password without the current one', async () => {
    const { client } = await registeredClient();
    const res = await client.patch('/users/me', { currentPassword: 'nope', newPassword: 'NewSparkle456' });
    expect(res.status).toBe(400);
  });

  it('ignores role in profile updates', async () => {
    const { client } = await registeredClient();
    const res = await client.patch('/users/me', { name: 'New Name', role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('CSRF and origin protection', () => {
  it('rejects state-changing requests without a CSRF token', async () => {
    const client = new Client();
    await client.init();
    const res = await client.agent.post('/api/v1/cart/items').set('Origin', ORIGIN).send({ productId: 'a'.repeat(24) });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });

  it('rejects a token belonging to another session', async () => {
    const a = new Client();
    const b = new Client();
    await a.init();
    await b.init();
    const res = await a.agent.post('/api/v1/auth/logout').set('Origin', ORIGIN).set(CSRF_HEADER, b.csrf);
    expect(res.status).toBe(403);
  });

  it('rejects requests from a foreign origin', async () => {
    const client = new Client();
    await client.init();
    const res = await client.agent.post('/api/v1/auth/logout').set('Origin', 'https://evil.example').set(CSRF_HEADER, client.csrf);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_ORIGIN');
  });

  it('does not send CORS allow headers to foreign origins', async () => {
    const res = await request(getApp()).options('/api/v1/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets security headers', async () => {
    const res = await request(getApp()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('password reset', () => {
  const outbox = () => (getMailer() as MemoryMailer).outbox;
  const tokenFrom = (text: string) => /token=([A-Za-z0-9_-]+)/.exec(text)?.[1];

  it('does not reveal whether an email is registered', async () => {
    const client = new Client();
    await client.init();
    const res = await client.post('/auth/forgot-password', { email: uniqueEmail() });
    expect(res.status).toBe(202);
    expect(outbox().filter((m) => m.subject.includes('Reset'))).toHaveLength(0);
  });

  it('resets the password with a single-use token and revokes sessions', async () => {
    const { client, email } = await registeredClient();
    const anon = new Client();
    await anon.init();
    await anon.post('/auth/forgot-password', { email });
    const mail = outbox().find((m) => m.to === email && m.subject.includes('Reset'));
    const token = tokenFrom(mail!.text)!;
    expect(token).toBeTruthy();

    const reset = await anon.post('/auth/reset-password', { token, password: 'Brand4NewPass' });
    expect(reset.status).toBe(200);
    expect((await client.get('/auth/me')).body.user).toBeNull();

    const again = await anon.post('/auth/reset-password', { token, password: 'Another4Pass' });
    expect(again.status).toBe(400);

    const login = await anon.post('/auth/login', { email, password: 'Brand4NewPass' });
    expect(login.status).toBe(200);
  });

  it('rejects malformed or unknown tokens', async () => {
    const client = new Client();
    await client.init();
    const res = await client.post('/auth/reset-password', { token: 'x'.repeat(43), password: 'Brand4NewPass' });
    expect(res.status).toBe(400);
  });

  it('verifies email with the emailed token', async () => {
    const { client, email } = await registeredClient();
    const mail = outbox().find((m) => m.to === email && m.subject.includes('Verify'));
    const res = await client.post('/auth/verify-email', { token: tokenFrom(mail!.text) });
    expect(res.status).toBe(200);
    expect((await UserModel.findOne({ email }).lean())?.emailVerified).toBe(true);
  });
});

describe('authorization', () => {
  it('returns 401 for protected routes without a session', async () => {
    const client = new Client();
    await client.init();
    expect((await client.get('/orders')).status).toBe(401);
    expect((await client.get('/users/me/addresses')).status).toBe(401);
  });

  it('returns 403 for admin routes as a customer and 401 when anonymous', async () => {
    const { client } = await registeredClient();
    expect((await client.get('/admin/dashboard')).status).toBe(403);
    expect((await client.post('/admin/products', {})).status).toBe(403);
    const anon = new Client();
    await anon.init();
    expect((await anon.get('/admin/orders')).status).toBe(401);
  });

  it('immediately loses admin access when the role is revoked in the database', async () => {
    const { client, email } = await registeredClient();
    await UserModel.updateOne({ email }, { role: 'admin' });
    expect((await client.get('/admin/dashboard')).status).toBe(200);
    await UserModel.updateOne({ email }, { role: 'customer' });
    expect((await client.get('/admin/dashboard')).status).toBe(403);
  });

  it('signs out disabled accounts', async () => {
    const { client, email } = await registeredClient();
    await UserModel.updateOne({ email }, { isActive: false });
    expect((await client.get('/auth/me')).body.user).toBeNull();
  });
});

describe('addresses', () => {
  it('manages addresses with a single default and per-user isolation', async () => {
    const { client } = await registeredClient();
    const body = {
      fullName: 'Ananya Sharma',
      phone: '+91 98765 43210',
      addressLine1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
    };
    const first = await client.post('/users/me/addresses', body);
    expect(first.status).toBe(201);
    expect(first.body.isDefault).toBe(true);
    expect(first.body.phone).toBe('9876543210');
    const second = await client.post('/users/me/addresses', { ...body, label: 'Office', isDefault: true });
    expect(second.body.isDefault).toBe(true);
    const list = await client.get('/users/me/addresses');
    expect(list.body.items.filter((a: { isDefault: boolean }) => a.isDefault)).toHaveLength(1);

    const { client: other } = await registeredClient();
    expect((await other.patch(`/users/me/addresses/${first.body.id}`, { city: 'Pune' })).status).toBe(404);
    expect((await other.delete(`/users/me/addresses/${first.body.id}`)).status).toBe(404);
  });

  it('validates PIN codes and states', async () => {
    const { client } = await registeredClient();
    const res = await client.post('/users/me/addresses', {
      fullName: 'A B',
      phone: '9876543210',
      addressLine1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Atlantis',
      postalCode: '012345',
    });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['state', 'postalCode']));
  });
});
