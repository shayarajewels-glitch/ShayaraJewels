import { Router } from 'express';
import { updateProfileSchema } from '@shayara/shared';
import { UserModel } from '../../models';
import { currentUser, requireAuth } from '../../middleware/security';
import { AppError } from '../../utils/errors';
import { parseBody } from '../../utils/http';
import { toUserDto } from '../auth/auth.service';
import { hashPassword, verifyPassword } from '../auth/password';
import { csrfTokenFor, destroyAllSessionsForUser, rotateSession } from '../auth/session.service';
import { addressRouter } from '../addresses/addresses.routes';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.patch('/me', async (req, res) => {
  const input = parseBody(req, updateProfileSchema);
  const user = await UserModel.findById(currentUser(req)._id).select('+passwordHash');
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue');

  // Explicit allowlist of updatable fields — role, email and flags can never be set here.
  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;

  let passwordChanged = false;
  if (input.newPassword) {
    const ok = await verifyPassword(user.passwordHash, input.currentPassword ?? '');
    if (!ok) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields', [
        { path: 'currentPassword', message: 'Current password is incorrect' },
      ]);
    }
    user.passwordHash = await hashPassword(input.newPassword);
    user.passwordChangedAt = new Date();
    passwordChanged = true;
  }
  await user.save();

  let csrfToken: string | undefined;
  if (passwordChanged) {
    // Sign out every other device and rotate this session id.
    const { session } = await rotateSession(req, res, user._id);
    await destroyAllSessionsForUser(user._id, session._id);
    csrfToken = csrfTokenFor(session);
  }
  res.json({ user: toUserDto(user), csrfToken });
});

usersRouter.use('/me/addresses', addressRouter);
