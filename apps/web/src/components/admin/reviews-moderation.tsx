'use client';

import { BadgeCheck, Check, MessageSquareText, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { REVIEW_STATUSES, type AdminReviewDto, type Paginated } from '@shayara/shared';
import { RatingStars } from '@/components/product/price';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { Alert, Badge, Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { AdminPageHeader, Pager, useAdminResource } from './admin-ui';
import { useQueryState } from './use-query-state';

export function ReviewsModeration() {
  const { params, set } = useQueryState();
  // Reviews publish immediately, so the default view is what customers can see.
  const status = params.get('status') ?? 'approved';
  const page = params.get('page') ?? '1';
  const qs = new URLSearchParams({ page, limit: '20', ...(status !== 'all' ? { status } : {}) });
  const { data, error, loading, reload } = useAdminResource<Paginated<AdminReviewDto>>(`/admin/reviews?${qs.toString()}`);

  return (
    <div>
      <AdminPageHeader
        title="Reviews"
        description="Only customers with a delivered order can review. Reviews go live immediately; reject one to hide it from the store and the product rating."
      />
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {[...REVIEW_STATUSES, 'all'].map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => set({ status: s === 'approved' ? null : s })}
            className={cn('rounded-full border px-4 py-1.5 text-xs capitalize', status === s ? 'border-rose-deep bg-rose-deep text-ivory' : 'border-input hover:border-rose-deep')}
          >
            {s === 'approved' ? 'Published' : s}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" title="Could not load reviews">{error}</Alert>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<MessageSquareText />} title={status === 'approved' ? 'No reviews yet' : 'No reviews here'}>
          {status === 'approved' ? 'Reviews appear here as soon as customers post them.' : 'Try another filter.'}
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <>
          <ul className="space-y-4" aria-busy={loading}>
            {data.items.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} onDone={reload} />
              </li>
            ))}
          </ul>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />
        </>
      )}
    </div>
  );
}

function ReviewCard({ review, onDone }: { review: AdminReviewDto; onDone: () => Promise<void> }) {
  const [note, setNote] = useState(review.moderationNote ?? '');
  const [busy, setBusy] = useState<'approved' | 'rejected' | null>(null);

  const moderate = async (status: 'approved' | 'rejected') => {
    setBusy(status);
    try {
      await api(`/admin/reviews/${review.id}`, { method: 'PATCH', body: { status, moderationNote: note.trim() || undefined } });
      toast.success(status === 'approved' ? 'Review approved and published' : 'Review rejected');
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <RatingStars rating={review.rating} count={1} showCount={false} />
          <h2 className="mt-1 font-sans text-base font-semibold">{review.title}</h2>
        </div>
        <Badge variant={review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'danger' : 'gold'}>{review.status}</Badge>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-charcoal-soft">{review.comment}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-soft">
        <span>
          {review.user ? (
            <>
              {review.user.name} · {review.user.email}
            </>
          ) : (
            review.authorName
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-success">
          <BadgeCheck className="size-3.5" aria-hidden /> Verified purchase{review.orderNumber ? ` (${review.orderNumber})` : ''}
        </span>
        <span>{formatDate(review.createdAt)}</span>
        {review.product && (
          <Link href={`/admin/products/${review.product.id}`} className="text-rose-deep underline underline-offset-4">
            {review.product.name}
          </Link>
        )}
      </p>
      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor={`note-${review.id}`} className="text-xs">
            Moderation note (internal, optional)
          </Label>
          <Input id={`note-${review.id}`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="h-9" />
        </div>
        <div className="flex gap-2">
          {review.status !== 'approved' && (
            <Button size="sm" loading={busy === 'approved'} disabled={busy !== null} onClick={() => moderate('approved')}>
              <Check /> Approve
            </Button>
          )}
          {review.status !== 'rejected' && (
            <Button size="sm" variant="outline" loading={busy === 'rejected'} disabled={busy !== null} onClick={() => moderate('rejected')}>
              <X /> Reject
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
