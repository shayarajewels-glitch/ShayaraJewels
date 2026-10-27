import { Star } from 'lucide-react';
import { discountPercent } from '@shayara/shared';
import { cn, formatPaise } from '@/lib/utils';

export function Price({ pricePaise, compareAtPricePaise, className, size = 'md' }: { pricePaise: number; compareAtPricePaise?: number | null; className?: string; size?: 'md' | 'lg' }) {
  const off = discountPercent(pricePaise, compareAtPricePaise);
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold text-charcoal', size === 'lg' ? 'text-2xl' : 'text-sm')}>{formatPaise(pricePaise)}</span>
      {off !== null && compareAtPricePaise && (
        <>
          <span className={cn('text-charcoal-soft line-through', size === 'lg' ? 'text-base' : 'text-xs')}>
            <span className="sr-only">Was </span>
            {formatPaise(compareAtPricePaise)}
          </span>
          <span className={cn('font-semibold text-rose-deep', size === 'lg' ? 'text-sm' : 'text-xs')}>{off}% off</span>
        </>
      )}
    </p>
  );
}

export function RatingStars({ rating, count, className, showCount = true }: { rating: number; count: number; className?: string; showCount?: boolean }) {
  if (count === 0) return null;
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-charcoal-soft', className)}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn('size-3.5', i <= rounded ? 'fill-champagne text-champagne' : i - 0.5 === rounded ? 'fill-champagne/50 text-champagne' : 'text-sand')} />
        ))}
      </span>
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5</span>
      {showCount && (
        <span>
          {rating.toFixed(1)} ({count} review{count === 1 ? '' : 's'})
        </span>
      )}
    </span>
  );
}
