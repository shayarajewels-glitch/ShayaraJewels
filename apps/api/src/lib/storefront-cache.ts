import { getConfig } from '../config/env';
import { getLogger } from '../config/logger';

const DEBOUNCE_MS = 1_000;
let timer: NodeJS.Timeout | null = null;

/**
 * Tells the Next.js storefront that catalogue data (prices, stock, publishing,
 * reviews) changed so cached pages are rebuilt on the next request. Calls are
 * coalesced, never block the caller and never fail it. Without
 * REVALIDATE_SECRET the storefront falls back to its 60-second revalidation.
 */
export function notifyCatalogueChanged(): void {
  const target = getConfig().storefrontRevalidate;
  if (!target || timer) return;
  timer = setTimeout(() => {
    timer = null;
    fetch(target.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': target.secret },
      body: JSON.stringify({ tags: ['catalogue'] }),
      signal: AbortSignal.timeout(5_000),
    })
      .then((res) => {
        if (!res.ok) getLogger().warn({ status: res.status }, 'Storefront revalidation was rejected');
      })
      .catch((err) => getLogger().warn({ err: err instanceof Error ? err.message : String(err) }, 'Storefront revalidation failed'));
  }, DEBOUNCE_MS);
  timer.unref();
}
