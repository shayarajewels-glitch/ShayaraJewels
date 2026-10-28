import { FINISH_LABELS, type Finish, type ProductType } from '../constants/catalogue';

const TYPE_LABELS: Record<ProductType, string> = {
  ring: 'Ring',
  necklace: 'Necklace',
  pendant: 'Pendant',
  bracelet: 'Bracelet',
  anklet: 'Anklet',
};

/**
 * Default search title for a product, e.g. "Mira Stacking Band – Gold Tone Ring for Women".
 * Used when no custom SEO title is set. The site name is appended by the page template.
 */
export function productSeoTitle(p: { name: string; finish: Finish; type: ProductType }): string {
  const finish = FINISH_LABELS[p.finish].replace(/\b\w/g, (c) => c.toUpperCase());
  const full = `${p.name} – ${finish} ${TYPE_LABELS[p.type]} for Women`;
  return full.length <= 60 ? full : `${p.name} – ${finish} ${TYPE_LABELS[p.type]}`;
}

const SEO_SUFFIX = ' Free shipping over ₹999, COD available.';

/** Default meta description: the product copy plus store benefits when they fit in 160 characters. */
export function productSeoDescription(p: { description: string }): string {
  const base = p.description.trim();
  if (base.length + SEO_SUFFIX.length <= 160) return base + SEO_SUFFIX;
  return base.length <= 160 ? base : `${base.slice(0, 157).trimEnd()}…`;
}
