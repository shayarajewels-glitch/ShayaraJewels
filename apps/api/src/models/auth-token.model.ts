import { Schema, model, type Types } from 'mongoose';

export const AUTH_TOKEN_PURPOSES = ['password_reset', 'email_verification'] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

/** Single-use, short-lived tokens. Only the SHA-256 hash is stored. */
export interface AuthToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const authTokenSchema = new Schema<AuthToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: AUTH_TOKEN_PURPOSES, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ userId: 1, purpose: 1 });
// Keep used/expired tokens for a day for auditing, then let MongoDB remove them.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const AuthTokenModel = model<AuthToken>('AuthToken', authTokenSchema);
