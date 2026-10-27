import { Schema, model, type Types } from 'mongoose';

/**
 * Server-side session. The browser cookie holds a random token; only its
 * SHA-256 hash is stored, so a database leak does not leak live sessions.
 * Sessions without a userId are anonymous (guest cart, CSRF).
 */
export interface Session {
  _id: Types.ObjectId;
  tokenHash: string;
  userId?: Types.ObjectId | null;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgent?: string;
  createdAt: Date;
}

const sessionSchema = new Schema<Session>(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<Session>('Session', sessionSchema);
