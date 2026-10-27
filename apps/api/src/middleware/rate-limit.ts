import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { getConfig } from '../config/env';

/**
 * In-memory rate limiters. They are per-process: when running several API
 * instances, plug a shared store (e.g. Redis) into these factories.
 */
function limiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  key?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}): RequestHandler {
  if (!getConfig().rateLimitEnabled) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    keyGenerator: options.key ?? ((req) => ipKeyGenerator(req.ip ?? 'unknown')),
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: options.message, requestId: req.id } });
    },
  });
}

const emailKey = (req: Request) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
  return `${ipKeyGenerator(req.ip ?? 'unknown')}|${email}`;
};

export const createRateLimiters = () => ({
  api: limiter({ windowMs: 60_000, limit: 300, message: 'Too many requests. Please slow down.' }),
  login: limiter({
    windowMs: 15 * 60_000,
    limit: 8,
    key: emailKey,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
  }),
  loginIp: limiter({
    windowMs: 15 * 60_000,
    limit: 50,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts from your network. Please try again later.',
  }),
  register: limiter({ windowMs: 60 * 60_000, limit: 10, message: 'Too many sign-ups from your network. Please try again later.' }),
  passwordReset: limiter({
    windowMs: 60 * 60_000,
    limit: 5,
    key: emailKey,
    message: 'Too many password reset requests. Please try again in an hour.',
  }),
  passwordResetIp: limiter({ windowMs: 60 * 60_000, limit: 20, message: 'Too many password reset requests. Please try again later.' }),
  checkout: limiter({ windowMs: 60_000, limit: 10, message: 'Too many checkout attempts. Please wait a moment.' }),
  review: limiter({ windowMs: 60 * 60_000, limit: 20, message: 'Too many reviews submitted. Please try again later.' }),
});

export type RateLimiters = ReturnType<typeof createRateLimiters>;
