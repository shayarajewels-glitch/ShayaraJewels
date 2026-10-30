import { z } from 'zod';
import { PRODUCT_TYPES } from '../constants/catalogue';

export const blogInputSchema = z.strictObject({
  title: z.string().trim().min(3, 'Add a title').max(120),
  /** Product type the post belongs to; null shows it on Shop all. */
  category: z.enum(PRODUCT_TYPES).nullable().default(null),
  /** Plain text. A blank line starts a new paragraph. */
  content: z.string().trim().min(20, 'Write at least a couple of sentences').max(20_000),
  image: z.strictObject(
    {
      url: z.string().trim().min(1).max(500),
      /** UploadThing file key when the picture was uploaded (absent for links and site paths). */
      key: z.string().trim().max(200).optional(),
      alt: z.string().trim().max(160).default(''),
    },
    { error: 'Add a picture' },
  ),
});
export type BlogInput = z.output<typeof blogInputSchema>;

export const blogListQuerySchema = z.object({
  /** A product type, or `general` for posts without one (shown on Shop all). Omit for every post. */
  category: z.union([z.enum(PRODUCT_TYPES), z.literal('general')]).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(6),
});
