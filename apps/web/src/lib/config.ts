/** Public configuration only. Nothing here may be secret: it is bundled for the browser. */
export const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** UploadThing is served by the API at /api/uploadthing (outside the /api/v1 prefix). */
export const UPLOADTHING_URL = `${new URL(PUBLIC_API_BASE_URL).origin}/api/uploadthing`;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Shayara';
export const SITE_TAGLINE = 'Everyday elegance. Your kind of shine.';
export const SITE_DESCRIPTION =
  'Shayara designs contemporary artificial and fashion jewellery — rings, necklaces, pendants, bracelets and anklets in gold, silver and rose gold tones.';

export const SUPPORT_EMAIL = 'shayarajewels@gmail.com';

/** Displayed form and the E.164 form used for tel: and WhatsApp links. */
export const SUPPORT_PHONE = { display: '+91 70111 67970', e164: '+917011167970' } as const;

export const STORE_ADDRESS = {
  lines: ['A-112, Commercial Enclave, Kunj Gali', 'Opp Lal Farm House Gate No.1 Transformer, Mohan Garden'],
  locality: 'New Delhi',
  region: 'Delhi',
  postalCode: '110059',
  country: 'India',
} as const;

/** One-line form, for footers and map searches. */
export const STORE_ADDRESS_TEXT = [...STORE_ADDRESS.lines, `${STORE_ADDRESS.locality}, ${STORE_ADDRESS.region} ${STORE_ADDRESS.postalCode}`, STORE_ADDRESS.country].join(', ');

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/shayara_jewels/',
  facebook: 'https://www.facebook.com/share/18g5tycz8B/',
} as const;
