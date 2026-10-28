'use client';

import Link from 'next/link';
import type { CouponDto } from '@shayara/shared';
import { Alert, Skeleton } from '@/components/ui/misc';
import { AdminPageHeader, useAdminResource } from './admin-ui';
import { CouponForm } from './coupon-form';

export function EditCoupon({ id }: { id: string }) {
  const { data, error, loading } = useAdminResource<CouponDto>(`/admin/coupons/${id}`);
  return (
    <div>
      <Link href="/admin/coupons" className="text-xs text-rose-deep hover:underline">
        ← All coupons
      </Link>
      {error && (
        <Alert variant="error" title="Could not load this coupon" className="mt-4">
          {error}
        </Alert>
      )}
      {loading && !data && <Skeleton className="mt-4 h-96" />}
      {data && (
        <>
          <AdminPageHeader title={data.code} description={`${data.title} · used in ${data.usageCount} order${data.usageCount === 1 ? '' : 's'}`} />
          {/* Remount when the coupon changes so the form picks up fresh values. */}
          <CouponForm key={data.id} coupon={data} />
        </>
      )}
    </div>
  );
}
