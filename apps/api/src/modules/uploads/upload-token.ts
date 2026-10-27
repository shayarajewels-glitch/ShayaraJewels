import type { Types } from 'mongoose';
import { getConfig } from '../../config/env';
import { hmacSha256Hex, safeEqual } from '../../utils/crypto';

const UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * The UploadThing client calls the API cross-origin without cookies, so admins
 * obtain a short-lived HMAC-signed upload token (via a CSRF-protected,
 * admin-only endpoint) and send it as a Bearer header. The token only proves
 * identity; admin role is re-checked against the database on every upload.
 */
export function issueUploadToken(userId: Types.ObjectId): { token: string; expiresAt: string } {
  const exp = Date.now() + UPLOAD_TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: userId.toString(), exp })).toString('base64url');
  const sig = hmacSha256Hex(getConfig().sessionSecret, `upload:${payload}`);
  return { token: `${payload}.${sig}`, expiresAt: new Date(exp).toISOString() };
}

export function verifyUploadToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!safeEqual(hmacSha256Hex(getConfig().sessionSecret, `upload:${payload}`), sig)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid: string; exp: number };
    if (typeof uid !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null;
    return uid;
  } catch {
    return null;
  }
}
