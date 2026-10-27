import { Router, type Request, type Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type SessionDto,
} from '@shayara/shared';
import type { RateLimiters } from '../../middleware/rate-limit';
import { currentUser, requireAuth } from '../../middleware/security';
import { parseBody } from '../../utils/http';
import { mergeGuestCartIntoUser } from '../cart/cart.service';
import {
  authenticate,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  toUserDto,
  verifyEmail,
} from './auth.service';
import { createSession, csrfTokenFor, destroySession, ensureSession, rotateSession } from './session.service';

async function startUserSession(req: Request, res: Response, user: Parameters<typeof toUserDto>[0]): Promise<SessionDto> {
  const { session, previousSessionId } = await rotateSession(req, res, user._id);
  if (previousSessionId) await mergeGuestCartIntoUser(previousSessionId, user._id);
  return { user: toUserDto(user), csrfToken: csrfTokenFor(session) };
}

export function buildAuthRouter(limiters: RateLimiters): Router {
  const router = Router();

  /** Returns the current user (or null) and a CSRF token; creates an anonymous session when needed. */
  router.get('/me', async (req, res) => {
    const session = await ensureSession(req, res);
    const body: SessionDto = { user: req.auth.user ? toUserDto(req.auth.user) : null, csrfToken: csrfTokenFor(session) };
    res.set('Cache-Control', 'no-store').json(body);
  });

  router.post('/register', limiters.register, async (req, res) => {
    const { acceptTerms: _accepted, ...input } = parseBody(req, registerSchema);
    const user = await registerUser(input);
    res.status(201).json(await startUserSession(req, res, user));
  });

  router.post('/login', limiters.loginIp, limiters.login, async (req, res) => {
    const { email, password } = parseBody(req, loginSchema);
    const user = await authenticate(email, password);
    res.json(await startUserSession(req, res, user));
  });

  router.post('/logout', async (req, res) => {
    await destroySession(req, res);
    const session = await createSession(req, res, null);
    const body: SessionDto = { user: null, csrfToken: csrfTokenFor(session) };
    res.json(body);
  });

  router.post('/forgot-password', limiters.passwordResetIp, limiters.passwordReset, async (req, res) => {
    const { email } = parseBody(req, forgotPasswordSchema);
    await requestPasswordReset(email);
    res.status(202).json({ message: 'If an account exists for that email, we have sent a password reset link.' });
  });

  router.post('/reset-password', limiters.passwordResetIp, async (req, res) => {
    const { token, password } = parseBody(req, resetPasswordSchema);
    await resetPassword(token, password);
    // All sessions were revoked; give this browser a fresh anonymous session.
    await destroySession(req, res);
    const session = await createSession(req, res, null);
    res.json({ message: 'Your password has been reset. Please log in.', csrfToken: csrfTokenFor(session) });
  });

  router.post('/verify-email', async (req, res) => {
    const { token } = parseBody(req, verifyEmailSchema);
    const user = await verifyEmail(token);
    res.json({ message: 'Email verified', user: req.auth.user?._id.equals(user._id) ? toUserDto(user) : undefined });
  });

  router.post('/resend-verification', requireAuth, limiters.passwordReset, async (req, res) => {
    await sendVerificationEmail(currentUser(req));
    res.status(202).json({ message: 'If your email is not yet verified, we have sent a new link.' });
  });

  return router;
}
