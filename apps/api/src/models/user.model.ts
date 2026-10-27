import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '@shayara/shared';

export interface User {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  isActive: boolean;
  passwordChangedAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: null, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer', required: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

export type UserDocument = HydratedDocument<User>;
export const UserModel = model<User>('User', userSchema);
