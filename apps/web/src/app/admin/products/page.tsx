import { Suspense } from 'react';
import { ProductsList } from '@/components/admin/products-list';
import { Spinner } from '@/components/ui/misc';

export const metadata = { title: 'Products' };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductsList />
    </Suspense>
  );
}
