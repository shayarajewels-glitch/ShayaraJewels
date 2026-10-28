import { EditCoupon } from '@/components/admin/edit-coupon';

export const metadata = { title: 'Edit coupon' };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCoupon id={id} />;
}
