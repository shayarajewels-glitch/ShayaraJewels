import { BadgeCheck } from 'lucide-react';
import type { Paginated, ReviewDto } from '@shayara/shared';
import { formatDate } from '@/lib/utils';
import { RatingStars } from './price';

export function ReviewsSection({
  reviews,
  averageRating,
  reviewCount,
}: {
  reviews: Paginated<ReviewDto> & { distribution: Record<number, number> };
  averageRating: number;
  reviewCount: number;
}) {
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-28 border-t border-border pt-14">
      <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="reviews-heading" className="text-3xl">
            Customer reviews
          </h2>
          {reviewCount > 0 ? (
            <>
              <p className="mt-4 font-display text-5xl">{averageRating.toFixed(1)}</p>
              <RatingStars rating={averageRating} count={reviewCount} className="mt-1" />
              <dl className="mt-5 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = reviews.distribution[star] ?? 0;
                  const pct = reviewCount ? Math.round((n / reviewCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <dt className="w-10">{star} star</dt>
                      <dd className="flex flex-1 items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-deep">
                          <span className="block h-full bg-champagne" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-8 text-right text-charcoal-soft">{n}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-charcoal-soft">No reviews yet.</p>
          )}
          <p className="mt-6 text-xs leading-5 text-charcoal-soft">
            Only customers who received this piece can review it. Reviews are checked before they appear. Write yours from your order page after delivery.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {reviews.items.length === 0 && <li className="py-2 text-sm text-charcoal-soft">Be the first to share how you styled it.</li>}
          {reviews.items.map((r) => (
            <li key={r.id} className="py-6 first:pt-0">
              <RatingStars rating={r.rating} count={1} showCount={false} />
              <h3 className="mt-2 font-sans text-base font-semibold">{r.title}</h3>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">{r.comment}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-soft">
                <span className="font-medium text-charcoal">{r.authorName}</span>
                <span className="inline-flex items-center gap-1 text-success">
                  <BadgeCheck className="size-3.5" aria-hidden /> Verified purchase
                </span>
                <span>· {formatDate(r.createdAt)}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
