import { z } from 'zod';

/** Admin-chosen picture for a category tile; null restores the built-in photo. */
export const categoryImageInputSchema = z.strictObject({
  image: z
    .strictObject({
      url: z.string().trim().min(1).max(500),
      /** UploadThing file key when the picture was uploaded (absent for links and site paths). */
      key: z.string().trim().max(200).optional(),
      alt: z.string().trim().max(160).default(''),
    })
    .nullable(),
});
export type CategoryImageInput = z.output<typeof categoryImageInputSchema>;
