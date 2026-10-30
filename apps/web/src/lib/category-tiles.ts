/**
 * Built-in category tile photos, used until an admin sets a picture of their
 * own (Admin → Category images). Each tile also has a tint behind the photo.
 */
export const CATEGORY_TILES: Record<string, { image: string; alt: string; tint: string }> = {
  bracelets: { image: '/images/products/brc-kavy-g-1.jpg', alt: 'Gold-tone charm bracelets', tint: 'from-champagne-soft to-ivory-deep' },
  rings: { image: '/images/products/rng-noor-rg-1.jpg', alt: 'Rose-gold-tone solitaire ring', tint: 'from-rose-soft to-ivory-deep' },
  necklaces: { image: '/images/products/nck-aria-g-2.jpg', alt: 'Layered gold-tone chains', tint: 'from-sand to-ivory-deep' },
  pendants: { image: '/images/products/pnd-chan-g-1.jpg', alt: 'Gold-tone crescent pendant', tint: 'from-champagne-soft to-rose-soft' },
  anklets: { image: '/images/products/ank-payl-s-1.jpg', alt: 'Silver-tone payal worn on the ankle', tint: 'from-sand to-ivory-deep' },
};
