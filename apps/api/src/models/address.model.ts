import { Schema, model, type Types } from 'mongoose';
import { INDIAN_STATES } from '@shayara/shared';

export interface Address {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: 'IN';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<Address>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, maxlength: 30 },
    fullName: { type: String, required: true, maxlength: 80 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    addressLine1: { type: String, required: true, maxlength: 120 },
    addressLine2: { type: String, maxlength: 120 },
    landmark: { type: String, maxlength: 80 },
    city: { type: String, required: true, maxlength: 60 },
    state: { type: String, required: true, enum: INDIAN_STATES },
    postalCode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    country: { type: String, enum: ['IN'], default: 'IN' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

addressSchema.index({ userId: 1, createdAt: -1 });
// At most one default address per user.
addressSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { isDefault: true }, name: 'one_default_per_user' });

export const AddressModel = model<Address>('Address', addressSchema);
