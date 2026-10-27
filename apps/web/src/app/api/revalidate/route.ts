import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { CATALOGUE_CACHE_TAG } from '@/lib/api-server';

const ALLOWED_TAGS = new Set([CATALOGUE_CACHE_TAG]);

function secretMatches(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the API after catalogue data changes (prices, stock, publishing,
 * approved reviews) so storefront pages never serve stale prices or stock.
 * Authenticated with a shared server-side secret.
 */
export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED_TAGS.has(t)) : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
