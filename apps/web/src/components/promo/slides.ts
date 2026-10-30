import { CATEGORIES, type ProductType, type PublicCouponDto } from '@shayara/shared';
import type { Slide } from './carousel';

/** Always-on highlights; live coupons are shown first. */
export const DEFAULT_SLIDES: Slide[] = [
  {
    kind: 'promo',
    id: 'bridal',
    eyebrow: 'The festive edit',
    title: 'Floral-style sets for every celebration',
    text: 'Chokers, temple coin necklaces, kangan and bridal payals — the look of tradition, made for today.',
    cta: 'Shop necklaces',
    href: '/categories/necklaces',
    image: '/images/banners/festive-edit.jpg',
    imageAlt: 'Woman in an embellished outfit wearing a matching necklace, earrings, bracelet and rings',
  },
  {
    kind: 'promo',
    id: 'gifts',
    eyebrow: 'Gifting made easy',
    title: 'Little treasures under ₹999',
    text: 'Hearts, evil eyes, charms and stackable rings — thoughtful gifts at every price.',
    cta: 'Shop gifts',
    href: '/shop?maxPrice=999',
    image: '/images/banners/gifting-edit.jpg',
    imageAlt: 'Rose-gold-tone necklace, earrings, bangle and rings displayed on stone blocks',
  },
  {
    kind: 'promo',
    id: 'new',
    eyebrow: 'Just in',
    title: 'Everyday shine, freshly arrived',
    text: 'Layering chains, dainty anklets and new-season rings in gold, silver and rose gold tones.',
    cta: 'See new arrivals',
    href: '/shop?sort=new',
    image: '/images/banners/new-arrivals.jpg',
    imageAlt: 'Woman smiling, wearing a delicate necklace, drop earrings and a bracelet',
  },
];

const categoryName = (t: ProductType) => CATEGORIES.find((c) => c.type === t)?.name ?? t;

/** Used when a coupon has no uploaded banner: a photo from the coupon's category. */
const FALLBACK_BANNERS: Record<ProductType | 'all', { url: string; alt: string }> = {
  all: { url: '/images/editorial/stacking-edit.jpg', alt: 'Gold-tone necklaces, earrings and a ring styled together' },
  anklet: { url: '/images/products/ank-ghun-s-1.jpg', alt: 'Silver-tone ghungroo payals worn with a lehenga' },
  bracelet: { url: '/images/products/brc-kang-g-1.jpg', alt: 'A stack of gold-tone kangan bangles' },
  ring: { url: '/images/products/rng-noor-rg-1.jpg', alt: 'Rose-gold-tone solitaire ring on white cloth' },
  necklace: { url: '/images/products/nck-rajw-g-1.jpg', alt: 'Kundan-style necklace set with coloured stones' },
  pendant: { url: '/images/products/pnd-moti-g-1.jpg', alt: 'Gold-tone pendant holding a single pearl' },
};

/** "Sitewide" or "On Anklets, Bracelets". */
export function appliesToLabel(appliesTo: ProductType[]): string {
  return appliesTo.length === 0 ? 'Sitewide' : `On ${appliesTo.map(categoryName).join(', ')}`;
}

export function couponSlide(c: PublicCouponDto): Slide {
  const single = c.appliesTo.length === 1 ? CATEGORIES.find((cat) => cat.type === c.appliesTo[0]) : undefined;
  const ends = c.endsAt ? new Date(c.endsAt) : null;
  return {
    kind: 'coupon',
    id: `coupon-${c.code}`,
    code: c.code,
    title: c.title,
    description: c.description,
    percent: c.discountPercent,
    appliesLabel: appliesToLabel(c.appliesTo),
    href: single ? `/categories/${single.slug}` : '/shop',
    image: c.image ?? FALLBACK_BANNERS[c.appliesTo.length === 1 ? c.appliesTo[0]! : 'all'],
    endsLabel: ends ? `Valid till ${ends.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : null,
  };
}
