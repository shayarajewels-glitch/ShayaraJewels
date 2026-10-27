import { Suspense } from 'react';
import { ReviewsModeration } from '@/components/admin/reviews-moderation';
import { Spinner } from '@/components/ui/misc';

export const metadata = { title: 'Reviews' };

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReviewsModeration />
    </Suspense>
  );
}
