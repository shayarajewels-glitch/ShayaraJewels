import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { CSRF_HEADER } from '@shayara/shared';
import { getConfig } from '../config/env';
import { isValidCsrfToken, loadSession } from '../modules/auth/session.service';
import { AppError, forbidden, unauthorized } from '../utils/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  await loadSession(req, res);
  next();
}

/**
 * CSRF protection for cookie-authenticated, state-changing requests:
 *  1. Origin (or Referer) must be an allowed frontend origin when present.
 *  2. A synchronizer token derived from the session must be sent in a custom
 *     header, which also forces a CORS preflight for cross-origin callers.
 * Routes authenticated by signatures (webhooks, UploadThing) are mounted
 * before this middleware.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const { allowedOrigins } = getConfig();

  const origin = req.get('origin') ?? refererOrigin(req.get('referer'));
  if (origin && !allowedOrigins.includes(origin)) {
    return next(new AppError(403, 'CSRF_ORIGIN', 'Request origin is not allowed'));
  }

  const token = req.get(CSRF_HEADER);
  const session = req.auth.session;
  if (!session || !token || !isValidCsrfToken(session, token)) {
    return next(new AppError(403, 'CSRF_INVALID', 'Your session has expired. Please refresh the page and try again.'));
  }
  next();
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return 'invalid';
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth.user) return next(unauthorized());
  next();
}

/** Role is read from the database-backed user on every request; nothing client-supplied is trusted. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth.user) return next(unauthorized());
  if (req.auth.user.role !== 'admin') return next(forbidden());
  next();
}

export function currentUser(req: Request) {
  const user = req.auth.user;
  if (!user) throw unauthorized();
  return user;
}
