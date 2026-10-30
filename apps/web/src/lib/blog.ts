import { CATEGORIES, type ProductType } from '@shayara/shared';

/** Blog content is plain text; a blank line starts a new paragraph. */
export function blogParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The first ~`max` characters of the post, cut at a word. */
export function blogExcerpt(content: string, max = 150): string {
  const text = content.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export function blogCategory(type: ProductType | null) {
  return type ? CATEGORIES.find((c) => c.type === type) : undefined;
}
