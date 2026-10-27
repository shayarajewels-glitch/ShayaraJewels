'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useHydrated } from '@/hooks/use-hydrated';
import type { ProductDetailDto } from '@shayara/shared';
import { ProductGrid } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { api, ApiError } from '@/lib/api-client';
import { useWishlist } from '@/stores/wishlist-store';

export default function WishlistPage() {
  const { items, replace } = useWishlist();
  const mounted = useHydrated();
  const refreshed = useRef(false);

  // Re-check current prices and availability; drop products that are no longer sold.
  useEffect(() => {
    if (!mounted || refreshed.current) return;
    refreshed.current = true;
    const current = useWishlist.getState().items;
    if (current.length === 0) return;
    void Promise.all(
      current.map((p) =>
        api<ProductDetailDto>(`/products/${p.slug}`).catch((err) => (err instanceof ApiError && err.status === 404 ? null : p)),
      ),
    ).then((fresh) => replace(fresh.filter((p): p is NonNullable<typeof p> => p !== null)));
  }, [mounted, replace]);

  return (
    <div className="container-page py-10">
      <h1 className="mb-2 text-4xl sm:text-5xl">Wishlist</h1>
      <p className="mb-10 text-sm text-charcoal-soft">Saved on this device. Prices and availability are refreshed when you visit.</p>
      {!mounted ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Heart />} title="Nothing saved yet" action={<Button asChild><Link href="/shop">Browse jewellery</Link></Button>}>
          Tap the heart on any piece to save it here.
        </EmptyState>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
