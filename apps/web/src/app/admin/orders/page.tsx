import { Suspense } from 'react';
import { OrdersList } from '@/components/admin/orders-list';
import { Spinner } from '@/components/ui/misc';

export const metadata = { title: 'Orders' };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrdersList />
    </Suspense>
  );
}
