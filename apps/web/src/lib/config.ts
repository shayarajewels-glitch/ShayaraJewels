/** Public configuration only. Nothing here may be secret: it is bundled for the browser. */
export const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** UploadThing is served by the API at /api/uploadthing (outside the /api/v1 prefix). */
export const UPLOADTHING_URL = `${new URL(PUBLIC_API_BASE_URL).origin}/api/uploadthing`;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Shayara';
export const SITE_TAGLINE = 'Everyday elegance. Your kind of shine.';
/** Homepage <title>: the brand plus what people search for. */
export const SITE_TITLE = 'Shayara – Artificial Jewellery Online for Women in India';
export const SITE_DESCRIPTION =
  'Shop artificial and fashion jewellery online at Shayara — rings, necklaces, pendants, bracelets, bangles and anklets in gold, silver and rose gold tones. Free shipping over ₹999, COD available.';

export const SUPPORT_EMAIL = 'shayarajewels@gmail.com';

/**
 * Shown in the footer while the store runs as a student project with demo
 * content and Razorpay test mode; while set, product ratings are not sent to
 * search engines. Set to null when taking real orders on a fresh database.
 */
export const DEMO_NOTICE: string | null =
  'Shayara is a student project demo store: payments run in test mode, orders are not fulfilled and some reviews are sample content.';

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
