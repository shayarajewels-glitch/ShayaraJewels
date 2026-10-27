import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../../models';
import { registeredClient } from '../../tests/helpers';
import { authorizeUpload } from './uploadthing.routes';
import { issueUploadToken, verifyUploadToken } from './upload-token';

const fakeReq = (authorization?: string) => ({ get: (h: string) => (h.toLowerCase() === 'authorization' ? authorization : undefined) }) as unknown as Request;

describe('media upload authorization', () => {
  it('rejects uploads without a token', async () => {
    await expect(authorizeUpload(fakeReq())).rejects.toThrow(/expired/i);
  });

  it('rejects tampered or forged tokens', async () => {
    const { email } = await registeredClient();
    const user = await UserModel.findOne({ email });
    const { token } = issueUploadToken(user!._id);
    const [payload] = token.split('.');
    expect(verifyUploadToken(`${payload}.${'0'.repeat(64)}`)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ uid: user!._id.toString(), exp: Date.now() + 1e9 })).toString('base64url');
    expect(verifyUploadToken(`${forged}.${token.split('.')[1]}`)).toBeNull();
  });

  it('rejects valid tokens for customers', async () => {
    const { email } = await registeredClient();
    const user = await UserModel.findOne({ email });
    const { token } = issueUploadToken(user!._id);
    await expect(authorizeUpload(fakeReq(`Bearer ${token}`))).rejects.toThrow(/administrators/i);
  });

  it('accepts admins and re-checks the role on every upload', async () => {
    const { email } = await registeredClient();
    await UserModel.updateOne({ email }, { role: 'admin' });
    const user = await UserModel.findOne({ email });
    const { token } = issueUploadToken(user!._id);
    await expect(authorizeUpload(fakeReq(`Bearer ${token}`))).resolves.toEqual({ userId: user!._id.toString() });
    await UserModel.updateOne({ email }, { role: 'customer' });
    await expect(authorizeUpload(fakeReq(`Bearer ${token}`))).rejects.toThrow();
  });

  it('upload token endpoint is admin-only', async () => {
    const { client } = await registeredClient();
    expect((await client.post('/admin/uploads/token')).status).toBe(403);
  });
});
