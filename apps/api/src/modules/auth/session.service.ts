import type { Request, Response } from 'express';
import type { HydratedDocument, Types } from 'mongoose';
import { getConfig } from '../../config/env';
import { SessionModel, UserModel, type Session } from '../../models';
import { hmacSha256Hex, randomToken, safeEqual, sha256 } from '../../utils/crypto';

type SessionDoc = HydratedDocument<Session>;

/** Only refresh lastSeenAt / sliding expiry this often, to avoid a write per request. */
const TOUCH_INTERVAL_MS = 10 * 60 * 1000;

function cookieOptions(maxAgeMs: number) {
  const { cookie } = getConfig();
  return {
    httpOnly: true,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    domain: cookie.domain,
    path: '/',
    maxAge: maxAgeMs,
  } as const;
}

function ttlFor(userId: Types.ObjectId | null | undefined): number {
  const config = getConfig();
  return userId ? config.sessionTtlMs : config.guestSessionTtlMs;
}

export async function createSession(
  req: Request,
  res: Response,
  userId: Types.ObjectId | null = null,
): Promise<SessionDoc> {
  const token = randomToken(32);
  const now = new Date();
  const ttl = ttlFor(userId);
  const session = await SessionModel.create({
    tokenHash: sha256(token),
    userId,
    expiresAt: new Date(now.getTime() + ttl),
    lastSeenAt: now,
    userAgent: req.get('user-agent')?.slice(0, 300),
  });
  res.cookie(getConfig().cookie.name, token, cookieOptions(ttl));
  req.auth = { session, user: req.auth?.user ?? null };
  return session;
}

/** Resolves the session cookie into a session and (optionally) an active user. */
export async function loadSession(req: Request, res: Response): Promise<void> {
  req.auth = { session: null, user: null };
  const token: unknown = req.cookies?.[getConfig().cookie.name];
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return;

  const session = await SessionModel.findOne({ tokenHash: sha256(token) });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    clearSessionCookie(res);
    return;
  }

  if (session.userId) {
    const user = await UserModel.findById(session.userId);
    if (!user || !user.isActive) {
      await session.deleteOne();
      clearSessionCookie(res);
      return;
    }
    req.auth.user = user;
  }
  req.auth.session = session;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const ttl = ttlFor(session.userId);
    session.lastSeenAt = new Date();
    session.expiresAt = new Date(Date.now() + ttl);
    await SessionModel.updateOne({ _id: session._id }, { lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt });
    res.cookie(getConfig().cookie.name, token, cookieOptions(ttl));
  }
}

export async function ensureSession(req: Request, res: Response): Promise<SessionDoc> {
  return req.auth.session ?? createSession(req, res, null);
}

/**
 * Issues a brand-new session id (prevents session fixation) after login or a
 * privilege change. Returns the previous session id so callers can migrate
 * guest state such as the cart.
 */
export async function rotateSession(
  req: Request,
  res: Response,
  userId: Types.ObjectId | null,
): Promise<{ session: SessionDoc; previousSessionId: Types.ObjectId | null }> {
  const previous = req.auth.session;
  const session = await createSession(req, res, userId);
  if (previous) await SessionModel.deleteOne({ _id: previous._id });
  return { session, previousSessionId: previous?._id ?? null };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  if (req.auth.session) await SessionModel.deleteOne({ _id: req.auth.session._id });
  req.auth = { session: null, user: null };
  clearSessionCookie(res);
}

export async function destroyAllSessionsForUser(userId: Types.ObjectId, exceptSessionId?: Types.ObjectId): Promise<void> {
  await SessionModel.deleteMany({ userId, ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}) });
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...opts } = cookieOptions(0);
  res.clearCookie(getConfig().cookie.name, opts);
}

/** Synchronizer CSRF token bound to the session. Not stored; derived with HMAC. */
export function csrfTokenFor(session: Session): string {
  return hmacSha256Hex(getConfig().sessionSecret, `csrf:${session.tokenHash}`);
}

export function isValidCsrfToken(session: Session, provided: string): boolean {
  return safeEqual(csrfTokenFor(session), provided);
}
