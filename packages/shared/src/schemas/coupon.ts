import { z } from 'zod';
import { PRODUCT_TYPES } from '../constants/catalogue';

/** Coupon codes are stored and compared upper-case, e.g. "ANKLET20". */
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,23}$/, 'Use 3–24 letters, numbers or dashes');

const couponImageSchema = z.strictObject({
  url: z.string().trim().min(1).max(500),
  /** UploadThing file key when the banner was uploaded (absent for site paths). */
  key: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(160).default(''),
});

const optionalDate = z.iso.datetime({ offset: true }).nullable().default(null);

export const couponInputSchema = z
  .strictObject({
    code: couponCodeSchema,
    title: z.string().trim().min(2, 'Add a short title').max(80),
    description: z.string().trim().max(200).default(''),
    discountPercent: z.number().int().min(1, 'At least 1%').max(90, 'At most 90%'),
    /** Product types the discount applies to; empty means the whole store. */
    appliesTo: z.array(z.enum(PRODUCT_TYPES)).max(PRODUCT_TYPES.length).default([]),
    image: couponImageSchema.nullable().default(null),
    active: z.boolean().default(true),
    startsAt: optionalDate,
    endsAt: optionalDate,
    /** Lower numbers show first in the carousel. */
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .refine((c) => !c.startsAt || !c.endsAt || new Date(c.startsAt) < new Date(c.endsAt), { path: ['endsAt'], message: 'End date must be after the start date' });
export type CouponInput = z.infer<typeof couponInputSchema>;

/** Updates send the full form, so they reuse the create schema. */
export const couponUpdateSchema = couponInputSchema;
