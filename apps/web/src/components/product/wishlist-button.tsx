'use client';

import { Heart } from 'lucide-react';
import { useHydrated } from '@/hooks/use-hydrated';
import { toast } from 'sonner';
import type { ProductSummaryDto } from '@shayara/shared';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/stores/wishlist-store';

export function WishlistButton({ product, className, withLabel = false }: { product: ProductSummaryDto; className?: string; withLabel?: boolean }) {
  const toggle = useWishlist((s) => s.toggle);
  const saved = useWishlist((s) => s.items.some((p) => p.id === product.id));
  const active = useHydrated() && saved;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        const added = toggle(product);
        toast.success(added ? 'Saved to your wishlist' : 'Removed from your wishlist');
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={cn(
        'relative z-10 inline-flex items-center gap-2 rounded-full transition-colors',
        withLabel ? 'h-12 border border-charcoal/80 px-5 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-ivory-deep' : 'bg-ivory/90 p-2 shadow-sm hover:bg-ivory',
        className,
      )}
    >
      <Heart className={cn('size-4', active ? 'fill-rose-deep text-rose-deep' : 'text-charcoal')} aria-hidden />
      {withLabel && (active ? 'Saved' : 'Wishlist')}
    </button>
  );
}
