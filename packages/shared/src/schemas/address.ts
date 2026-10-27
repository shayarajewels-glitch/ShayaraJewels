import { z } from 'zod';
import { INDIAN_STATES } from '../constants/commerce';
import { nameSchema, phoneSchema } from './common';

const line = (label: string, max = 120) =>
  z.string({ error: `${label} is required` }).trim().min(3, `${label} is too short`).max(max, `${label} is too long`);

/** Absent stays undefined (leave unchanged); an empty string becomes null (clear the field). */
const optionalLine = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

const addressFields = {
  label: z.string().trim().min(1).max(30),
  fullName: nameSchema,
  phone: phoneSchema,
  addressLine1: line('Address line 1'),
  addressLine2: optionalLine(),
  landmark: optionalLine(80),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.enum(INDIAN_STATES, { error: 'Select a state' }),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  country: z.literal('IN'),
  isDefault: z.boolean(),
};

export const addressSchema = z.strictObject({
  ...addressFields,
  label: addressFields.label.default('Home'),
  country: addressFields.country.default('IN'),
  isDefault: addressFields.isDefault.default(false),
});
export type AddressInput = z.input<typeof addressSchema>;
export type AddressData = z.output<typeof addressSchema>;

// Built from the default-free fields so a partial update never resets omitted values.
export const updateAddressSchema = z
  .strictObject(addressFields)
  .partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Nothing to update',
});
