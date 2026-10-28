import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-ui';
import { CouponForm } from '@/components/admin/coupon-form';

export const metadata = { title: 'New coupon' };

export default function NewCouponPage() {
  return (
    <div>
      <Link href="/admin/coupons" className="text-xs text-rose-deep hover:underline">
        ← All coupons
      </Link>
      <AdminPageHeader title="New coupon" description="Set the discount and where it applies, then add a banner for the carousel." />
      <CouponForm />
    </div>
  );
}
