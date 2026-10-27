/** Public configuration only. Nothing here may be secret: it is bundled for the browser. */
export const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** UploadThing is served by the API at /api/uploadthing (outside the /api/v1 prefix). */
export const UPLOADTHING_URL = `${new URL(PUBLIC_API_BASE_URL).origin}/api/uploadthing`;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Shayara';
export const SITE_TAGLINE = 'Everyday elegance. Your kind of shine.';
export const SITE_DESCRIPTION =
  'Shayara designs contemporary artificial and fashion jewellery — rings, necklaces, pendants, bracelets and anklets in gold, silver and rose gold tones.';

export const SUPPORT_EMAIL = 'care@shayara.example';
