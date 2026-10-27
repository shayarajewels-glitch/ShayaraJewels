export const PRODUCT_TYPES = ['bracelet', 'ring', 'necklace', 'pendant', 'anklet'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FINISHES = ['gold', 'silver', 'rose-gold'] as const;
export type Finish = (typeof FINISHES)[number];

export const FINISH_LABELS: Record<Finish, string> = {
  gold: 'Gold tone',
  silver: 'Silver tone',
  'rose-gold': 'Rose gold tone',
};

export interface CategoryDefinition {
  slug: string;
  type: ProductType;
  name: string;
  tagline: string;
  description: string;
}

/** Categories map 1:1 onto product types; the slug is the public URL segment. */
export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    slug: 'bracelets',
    type: 'bracelet',
    name: 'Bracelets',
    tagline: 'Stack, layer, repeat.',
    description: 'Delicate chains, cuffs and charm bracelets designed for everyday stacking.',
  },
  {
    slug: 'rings',
    type: 'ring',
    name: 'Rings',
    tagline: 'Small details, big statements.',
    description: 'Minimal bands, solitaire-inspired designs and adjustable statement rings.',
  },
  {
    slug: 'necklaces',
    type: 'necklace',
    name: 'Necklaces',
    tagline: 'Frame every neckline.',
    description: 'Layering chains, chokers and occasion necklaces in gold, silver and rose gold tones.',
  },
  {
    slug: 'pendants',
    type: 'pendant',
    name: 'Pendants',
    tagline: 'Meaningful, minimal, yours.',
    description: 'Initial, celestial and gemstone-inspired pendants on fine chains.',
  },
  {
    slug: 'anklets',
    type: 'anklet',
    name: 'Anklets',
    tagline: 'A little shine with every step.',
    description: 'Lightweight anklets with charms, beads and dainty chains.',
  },
] as const;

export function categoryBySlug(slug: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByType(type: ProductType): CategoryDefinition {
  const found = CATEGORIES.find((c) => c.type === type);
  if (!found) throw new Error(`Unknown product type ${type}`);
  return found;
}

export const PRODUCT_SORTS = ['new', 'bestsellers', 'top-rated', 'price-asc', 'price-desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  new: 'New arrivals',
  bestsellers: 'Bestsellers',
  'top-rated': 'Top rated',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

/** A product needs at least this many published reviews to appear in "top rated". */
export const TOP_RATED_MIN_REVIEWS = 3;

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const MAX_PAGE_SIZE = 48;
export const DEFAULT_PAGE_SIZE = 12;
export const LOW_STOCK_THRESHOLD = 5;
