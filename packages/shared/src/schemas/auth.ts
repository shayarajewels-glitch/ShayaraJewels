import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from './common';

export const registerSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  acceptTerms: z.literal(true, { error: 'Please accept the terms and privacy policy' }),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const tokenSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{32,128}$/, 'Invalid or expired link');

export const resetPasswordSchema = z.strictObject({
  token: tokenSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.strictObject({
  token: tokenSchema,
});

export const updateProfileSchema = z
  .strictObject({
    name: nameSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((v) => !v.newPassword || !!v.currentPassword, {
    path: ['currentPassword'],
    message: 'Enter your current password to set a new one',
  });
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
