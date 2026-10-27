import type { Types } from 'mongoose';
import type { RegisterInput, UserDto } from '@shayara/shared';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { isDuplicateKeyError } from '../../config/db';
import { AuthTokenModel, UserModel, type AuthTokenPurpose, type User } from '../../models';
import { getMailer, sendMailSafely } from '../../lib/mailer';
import { randomToken, sha256 } from '../../utils/crypto';
import { AppError, badRequest, conflict } from '../../utils/errors';
import { burnPasswordCheck, hashPassword, needsRehash, verifyPassword } from './password';
import { destroyAllSessionsForUser } from './session.service';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export function toUserDto(user: User): UserDto {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(input: Omit<RegisterInput, 'acceptTerms'> & { email: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    // Role is never taken from input: every self-registered account is a customer.
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      role: 'customer',
    });
    await sendVerificationEmail(user);
    return user;
  } catch (err) {
    if (isDuplicateKeyError(err)) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');
    throw err;
  }
}

const INVALID_LOGIN = new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

export async function authenticate(email: string, password: string) {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user) {
    await burnPasswordCheck(password);
    throw INVALID_LOGIN;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw INVALID_LOGIN;
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Please contact support.');

  if (needsRehash(user.passwordHash)) user.passwordHash = await hashPassword(password);
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

async function issueToken(userId: Types.ObjectId, purpose: AuthTokenPurpose, ttlMs: number): Promise<string> {
  // Only the newest token of each purpose stays valid.
  await AuthTokenModel.updateMany({ userId, purpose, usedAt: null }, { usedAt: new Date() });
  const token = randomToken(32);
  await AuthTokenModel.create({ userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

/** Atomically marks a token used, so it can be redeemed exactly once. */
async function consumeToken(token: string, purpose: AuthTokenPurpose) {
  const record = await AuthTokenModel.findOneAndUpdate(
    { tokenHash: sha256(token), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
    { returnDocument: 'after' },
  );
  if (!record) throw badRequest('This link is invalid or has expired. Please request a new one.', 'INVALID_TOKEN');
  return record;
}

export async function sendVerificationEmail(user: User): Promise<void> {
  if (!getMailer().enabled || user.emailVerified) return;
  const token = await issueToken(user._id, 'email_verification', VERIFY_TOKEN_TTL_MS);
  const link = `${getConfig().frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMailSafely({
    to: user.email,
    subject: 'Verify your Shayara email',
    text: `Hi ${user.name},\n\nWelcome to Shayara! Please confirm your email address:\n${link}\n\nThis link expires in 48 hours.\n\nIf you didn't create an account, you can ignore this email.`,
  });
}

export async function verifyEmail(token: string) {
  const record = await consumeToken(token, 'email_verification');
  const user = await UserModel.findByIdAndUpdate(
    record.userId,
    { emailVerified: true, emailVerifiedAt: new Date() },
    { returnDocument: 'after' },
  );
  if (!user) throw badRequest('This link is invalid or has expired.', 'INVALID_TOKEN');
  return user;
}

/** Always resolves the same way whether or not the account exists (no enumeration). */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email, isActive: true });
  if (!user) return;
  if (!getMailer().enabled) {
    getLogger().warn('Password reset requested but email delivery is not configured');
    return;
  }
  const token = await issueToken(user._id, 'password_reset', RESET_TOKEN_TTL_MS);
  const link = `${getConfig().frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMailSafely({
    to: user.email,
    subject: 'Reset your Shayara password',
    text: `Hi ${user.name},\n\nWe received a request to reset your password. Use this link within 30 minutes:\n${link}\n\nIf you didn't ask for this, you can safely ignore this email — your password won't change.`,
  });
}

export async function resetPassword(token: string, password: string) {
  const record = await consumeToken(token, 'password_reset');
  const user = await UserModel.findById(record.userId);
  if (!user || !user.isActive) throw badRequest('This link is invalid or has expired.', 'INVALID_TOKEN');
  user.passwordHash = await hashPassword(password);
  user.passwordChangedAt = new Date();
  await user.save();
  // A reset proves control of the mailbox, so the email is also verified.
  if (!user.emailVerified) await UserModel.updateOne({ _id: user._id }, { emailVerified: true, emailVerifiedAt: new Date() });
  await AuthTokenModel.updateMany({ userId: user._id, purpose: 'password_reset', usedAt: null }, { usedAt: new Date() });
  await destroyAllSessionsForUser(user._id);
  return user;
}
